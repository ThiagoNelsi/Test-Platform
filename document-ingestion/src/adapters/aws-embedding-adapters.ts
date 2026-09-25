import {
  DynamoDBClient,
  GetItemCommand,
  UpdateItemCommand,
  type AttributeValue,
} from "@aws-sdk/client-dynamodb";
import OpenAI from "openai";
import postgres from "postgres";
import {
  createEmbeddingProcessor,
  type BatchClaim,
  type BatchCompletion,
  type EmbeddingProcessorPorts,
} from "../embeddings/embedding-processor";
import type { RuntimeSecrets } from "./runtime-secrets";

const dynamodb = new DynamoDBClient({});

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function isConditionalCheckFailure(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "ConditionalCheckFailedException"
  );
}

function batchStatuses(item: Record<string, AttributeValue> | undefined): string[] {
  return Object.values(item?.batches?.M ?? {}).flatMap((batch) => {
    const status = batch.M?.status?.S;
    return status ? [status] : [];
  });
}

function completedClaim(item: Record<string, AttributeValue> | undefined, batchId: string): BatchClaim {
  const batchStatus = item?.batches?.M?.[batchId]?.M?.status?.S;
  if (batchStatus !== "completed") {
    throw new Error(`Batch ${batchId} is already being processed or does not exist`);
  }

  const statuses = batchStatuses(item);
  return statuses.length > 0 && statuses.every((status) => status === "completed")
    ? "document-completed"
    : "batch-completed";
}

export function createAwsEmbeddingProcessor(secrets: RuntimeSecrets) {
  const tableName = requiredEnvironment("EMBEDDING_BATCHES_TABLE_NAME");
  const openai = new OpenAI({ apiKey: secrets.openAiApiKey });
  const embeddingsDb = postgres(secrets.embeddingsDatabaseUrl, { max: 2 });
  const applicationDb = postgres(secrets.applicationDatabaseUrl, { max: 2 });

  const ports: EmbeddingProcessorPorts = {
    claimBatch: async (document, batchId) => {
      const now = new Date().toISOString();
      try {
        await dynamodb.send(
          new UpdateItemCommand({
            TableName: tableName,
            Key: { document: { S: document } },
            UpdateExpression:
              "SET batches.#batch.#status = :processing, batches.#batch.updated_at = :now, updated_at = :now",
            ConditionExpression: "batches.#batch.#status = :pending",
            ExpressionAttributeNames: { "#batch": batchId, "#status": "status" },
            ExpressionAttributeValues: {
              ":pending": { S: "pending" },
              ":processing": { S: "processing" },
              ":now": { S: now },
            },
          }),
        );
        return "claimed";
      } catch (error) {
        if (!isConditionalCheckFailure(error)) throw error;

        const result = await dynamodb.send(
          new GetItemCommand({
            TableName: tableName,
            Key: { document: { S: document } },
            ConsistentRead: true,
          }),
        );
        return completedClaim(result.Item, batchId);
      }
    },
    releaseBatch: async (document, batchId) => {
      try {
        await dynamodb.send(
          new UpdateItemCommand({
            TableName: tableName,
            Key: { document: { S: document } },
            UpdateExpression: "SET batches.#batch.#status = :pending, updated_at = :now",
            ConditionExpression: "batches.#batch.#status = :processing",
            ExpressionAttributeNames: { "#batch": batchId, "#status": "status" },
            ExpressionAttributeValues: {
              ":pending": { S: "pending" },
              ":processing": { S: "processing" },
              ":now": { S: new Date().toISOString() },
            },
          }),
        );
      } catch (error) {
        if (!isConditionalCheckFailure(error)) throw error;
      }
    },
    createEmbeddings: async (texts) => {
      console.log("Calling OpenAI embeddings API", { chunks: texts.length });
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: texts,
        dimensions: 1_024,
      });
      return response.data.map(({ embedding }) => embedding);
    },
    saveEmbeddings: async (chunks, embeddings, document) => {
      const rows = chunks.map((chunk, index) => ({
        content: chunk.text,
        embedding: JSON.stringify(embeddings[index]),
        pages: chunk.pages,
        document,
      }));

      await embeddingsDb`
        INSERT INTO embeddings ${embeddingsDb(rows, "content", "embedding", "pages", "document")}
      `;
    },
    completeBatch: async (document, batchId): Promise<BatchCompletion> => {
      const now = new Date().toISOString();
      const result = await dynamodb.send(
        new UpdateItemCommand({
          TableName: tableName,
          Key: { document: { S: document } },
          UpdateExpression:
            "SET batches.#batch.#status = :completed, batches.#batch.updated_at = :now, updated_at = :now ADD processed_batches :one",
          ConditionExpression: "batches.#batch.#status = :processing",
          ExpressionAttributeNames: { "#batch": batchId, "#status": "status" },
          ExpressionAttributeValues: {
            ":processing": { S: "processing" },
            ":completed": { S: "completed" },
            ":now": { S: now },
            ":one": { N: "1" },
          },
          ReturnValues: "ALL_NEW",
        }),
      );

      const statuses = batchStatuses(result.Attributes);
      if (statuses.length === 0 || !statuses.every((status) => status === "completed")) {
        return "processing";
      }

      await dynamodb.send(
        new UpdateItemCommand({
          TableName: tableName,
          Key: { document: { S: document } },
          UpdateExpression: "SET #status = :completed, updated_at = :now",
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: {
            ":completed": { S: "completed" },
            ":now": { S: now },
          },
        }),
      );
      return "completed";
    },
    markDocumentProcessed: async (document) => {
      const rows = await applicationDb`
        UPDATE "public"."Resource"
        SET status = 'PROCESSED', "processedAt" = NOW(), "updatedAt" = NOW()
        WHERE "objectKey" = ${document}
        RETURNING id
      `;
      if (rows.length === 0) throw new Error(`Resource not found for document ${document}`);
    },
  };

  return createEmbeddingProcessor(ports);
}
