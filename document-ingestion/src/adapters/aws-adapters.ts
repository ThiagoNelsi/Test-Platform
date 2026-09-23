import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  type AttributeValue,
} from "@aws-sdk/client-dynamodb";
import { SendMessageBatchCommand, SQSClient } from "@aws-sdk/client-sqs";
import { GetDocumentAnalysisCommand, TextractClient } from "@aws-sdk/client-textract";
import {
  createDocumentProcessor,
  type BatchTrackingRecord,
  type DocumentProcessorPorts,
} from "../ingestion/document-processor";
import { createSqsBatchPublisher } from "./sqs-batch-publisher";
import { createTextractResultLoader } from "./textract-results";

const textract = new TextractClient({});
const sqs = new SQSClient({});
const dynamodb = new DynamoDBClient({});

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function trackingItem(record: BatchTrackingRecord): Record<string, AttributeValue> {
  return {
    document: { S: record.document },
    status: { S: "processing" },
    batches: {
      M: Object.fromEntries(
        record.batches.map(({ id, status }) => [id, { M: { status: { S: status } } }]),
      ),
    },
    total_batches: { N: String(record.totalBatches) }, // legacy
    processed_batches: { N: "0" }, // legacy
    job_id: { S: record.jobId },
    enqueue_completed: { BOOL: true },
    updated_at: { S: record.updatedAt },
  };
}

export function createAwsDocumentProcessor() {
  const queueUrl = requiredEnvironment("DOCUMENTCHUNKSQUEUE_QUEUE_URL");
  const tableName = requiredEnvironment("EMBEDDING_BATCHES_TABLE_NAME");

  const loadBlocks = createTextractResultLoader((jobId, nextToken) =>
    textract.send(
      new GetDocumentAnalysisCommand({
        JobId: jobId,
        MaxResults: 1_000,
        ...(nextToken ? { NextToken: nextToken } : {}),
      }),
    ),
  );
  const publishBatches = createSqsBatchPublisher((entries) =>
    sqs.send(new SendMessageBatchCommand({ QueueUrl: queueUrl, Entries: entries })),
  );

  const ports: DocumentProcessorPorts = {
    loadBlocks,
    publishBatches,
    batchesAlreadyEnqueued: async (document, jobId) => {
      const result = await dynamodb.send(
        new GetItemCommand({
          TableName: tableName,
          Key: { document: { S: document } },
          ConsistentRead: true,
        }),
      );
      return result.Item?.job_id?.S === jobId && result.Item.enqueue_completed?.BOOL === true;
    },
    markBatchesEnqueued: async (record) => {
      await dynamodb.send(
        new PutItemCommand({ TableName: tableName, Item: trackingItem(record) }),
      );
    },
  };

  return createDocumentProcessor(ports);
}
