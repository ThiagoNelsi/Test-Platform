import { createHash } from "node:crypto";
import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  type AttributeValue,
} from "@aws-sdk/client-dynamodb";
import {
  SendMessageBatchCommand,
  SQSClient,
  type SendMessageBatchRequestEntry,
  type SendMessageBatchResultEntry,
} from "@aws-sdk/client-sqs";
import {
  GetDocumentAnalysisCommand,
  TextractClient,
  type Block,
  type GetDocumentAnalysisCommandOutput,
} from "@aws-sdk/client-textract";
import type { SQSBatchResponse, SQSEvent, SQSRecord } from "aws-lambda";
import {
  countEmbeddingTokens,
  createBatches,
  splitText,
  type ChunkBatch,
} from "./chunking";
import { linearizeLayout } from "./linearize-layout";

const textract = new TextractClient({});
const sqs = new SQSClient({});
const dynamodb = new DynamoDBClient({});

type TextractNotification = {
  JobId: string;
  Status: string;
  DocumentLocation: {
    S3ObjectName: string;
  };
};

type ChunkingConfig = {
  queueUrl: string;
  tableName: string;
  chunkSize: number;
  chunkOverlap: number;
  tokenBatchSize: number;
};

export type ChunkingDependencies = {
  getDocumentAnalysis: (
    jobId: string,
    nextToken?: string,
  ) => Promise<GetDocumentAnalysisCommandOutput>;
  sendMessageBatch: (
    entries: SendMessageBatchRequestEntry[],
    queueUrl: string,
  ) => Promise<{
    Successful?: SendMessageBatchResultEntry[];
    Failed?: Array<{ Id?: string; SenderFault?: boolean; Code?: string; Message?: string }>;
  }>;
  getTrackingItem: (
    document: string,
    tableName: string,
  ) => Promise<Record<string, AttributeValue> | undefined>;
  putTrackingItem: (
    item: Record<string, AttributeValue>,
    tableName: string,
  ) => Promise<void>;
  countTokens: (text: string) => number;
};

const defaultDependencies: ChunkingDependencies = {
  getDocumentAnalysis: async (jobId, nextToken) =>
    textract.send(
      new GetDocumentAnalysisCommand({
        JobId: jobId,
        MaxResults: 1_000,
        ...(nextToken ? { NextToken: nextToken } : {}),
      }),
    ),
  sendMessageBatch: async (entries, queueUrl) =>
    sqs.send(new SendMessageBatchCommand({ QueueUrl: queueUrl, Entries: entries })),
  getTrackingItem: async (document, tableName) => {
    const result = await dynamodb.send(
      new GetItemCommand({
        TableName: tableName,
        Key: { document: { S: document } },
        ConsistentRead: true,
      }),
    );
    return result.Item;
  },
  putTrackingItem: async (item, tableName) => {
    await dynamodb.send(new PutItemCommand({ TableName: tableName, Item: item }));
  },
  countTokens: countEmbeddingTokens,
};

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function configuration(): ChunkingConfig {
  return {
    queueUrl: requiredEnvironment("DOCUMENTCHUNKSQUEUE_QUEUE_URL"),
    tableName: requiredEnvironment("EMBEDDING_BATCHES_TABLE_NAME"),
    chunkSize: 1_000,
    chunkOverlap: 400,
    tokenBatchSize: 8_192,
  };
}

export function parseNotification(record: SQSRecord): TextractNotification {
  const envelope = JSON.parse(record.body) as { Message?: string | TextractNotification };
  const notification =
    typeof envelope.Message === "string"
      ? (JSON.parse(envelope.Message) as Partial<TextractNotification>)
      : ((envelope.Message ?? envelope) as Partial<TextractNotification>);

  if (
    typeof notification.JobId !== "string" ||
    typeof notification.Status !== "string" ||
    typeof notification.DocumentLocation?.S3ObjectName !== "string"
  ) {
    throw new Error("Invalid Textract SNS notification");
  }

  return notification as TextractNotification;
}

async function getAllBlocks(
  jobId: string,
  dependencies: ChunkingDependencies,
): Promise<Block[]> {
  const blocks: Block[] = [];
  const seenTokens = new Set<string>();
  let nextToken: string | undefined;

  do {
    const result = await dependencies.getDocumentAnalysis(jobId, nextToken);
    blocks.push(...(result.Blocks ?? []));

    nextToken = result.NextToken || undefined;
    if (nextToken && seenTokens.has(nextToken)) {
      throw new Error(`Textract returned a repeated pagination token for job ${jobId}`);
    }
    if (nextToken) seenTokens.add(nextToken);
  } while (nextToken);

  return blocks;
}

function batchId(jobId: string, index: number, batch: ChunkBatch): string {
  return createHash("sha256")
    .update(`${jobId}:${index}:${JSON.stringify(batch.chunks)}`)
    .digest("hex");
}

function messageEntries(
  jobId: string,
  document: string,
  batches: ChunkBatch[],
): SendMessageBatchRequestEntry[] {
  return batches.map((batch, index) => {
    const stableBatchId = batchId(jobId, index, batch);
    return {
      Id: String(index),
      MessageBody: JSON.stringify({
        chunks: batch.chunks,
        document,
        batchId: stableBatchId,
        batchIndex: index,
        totalBatches: batches.length,
      }),
    };
  });
}

async function sendEntries(
  entries: SendMessageBatchRequestEntry[],
  config: ChunkingConfig,
  dependencies: ChunkingDependencies,
): Promise<void> {
  for (let offset = 0; offset < entries.length; offset += 10) {
    let pending = entries.slice(offset, offset + 10);

    for (let attempt = 1; pending.length > 0 && attempt <= 3; attempt += 1) {
      const result = await dependencies.sendMessageBatch(pending, config.queueUrl);
      const successfulIds = new Set(
        (result.Successful ?? []).flatMap((entry) => (entry.Id ? [entry.Id] : [])),
      );
      const failuresById = new Map(
        (result.Failed ?? []).flatMap((failure) =>
          failure.Id ? [[failure.Id, failure] as const] : [],
        ),
      );

      const senderFault = [...failuresById.values()].find((failure) => failure.SenderFault);
      if (senderFault) {
        throw new Error(
          `SQS rejected chunk batch ${senderFault.Id}: ${senderFault.Code ?? "unknown"} ${senderFault.Message ?? ""}`.trim(),
        );
      }

      pending = pending.filter((entry) => !successfulIds.has(entry.Id ?? ""));
    }

    if (pending.length > 0) {
      throw new Error(
        `SQS failed to accept chunk batches: ${pending.map((entry) => entry.Id).join(", ")}`,
      );
    }
  }
}

async function processRecord(
  record: SQSRecord,
  config: ChunkingConfig,
  dependencies: ChunkingDependencies,
): Promise<void> {
  const notification = parseNotification(record);
  const { JobId: jobId, Status: status } = notification;
  const document = notification.DocumentLocation.S3ObjectName;

  console.log("Processing Textract notification", { jobId, document, status });

  if (status !== "SUCCEEDED") {
    throw new Error(`Textract job ${jobId} finished with status ${status}`);
  }

  const existing = await dependencies.getTrackingItem(document, config.tableName);
  if (existing?.job_id?.S === jobId && existing.enqueue_completed?.BOOL === true) {
    console.log("Chunk batches were already enqueued", { jobId, document });
    return;
  }

  const blocks = await getAllBlocks(jobId, dependencies);
  const pages = linearizeLayout(blocks);
  const chunks = splitText(pages, config.chunkSize, config.chunkOverlap);
  const batches = createBatches(chunks, config.tokenBatchSize, dependencies.countTokens);

  console.log("Document chunking complete", {
    jobId,
    document,
    chunks: chunks.length,
    batches: batches.length,
  });

  await sendEntries(messageEntries(jobId, document, batches), config, dependencies);
  await dependencies.putTrackingItem(
    {
      document: { S: document },
      status: { S: "processing" },
      total_batches: { N: String(batches.length) },
      processed_batches: { N: "0" },
      job_id: { S: jobId },
      enqueue_completed: { BOOL: true },
      updated_at: { S: new Date().toISOString() },
    },
    config.tableName,
  );
}

export function createHandler(
  dependencies: ChunkingDependencies = defaultDependencies,
  getConfig: () => ChunkingConfig = configuration,
) {
  return async (event: SQSEvent): Promise<SQSBatchResponse> => {
    const batchItemFailures: SQSBatchResponse["batchItemFailures"] = [];
    const config = getConfig();

    for (const record of event.Records) {
      try {
        await processRecord(record, config, dependencies);
      } catch (error) {
        console.error("Document chunking failed", {
          messageId: record.messageId,
          error,
        });
        batchItemFailures.push({ itemIdentifier: record.messageId });
      }
    }

    return { batchItemFailures };
  };
}

export const handler = createHandler();
