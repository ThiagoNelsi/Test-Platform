import type { Block } from "@aws-sdk/client-textract";
import type { SQSEvent, SQSRecord } from "aws-lambda";
import { describe, expect, it, vi } from "vitest";
import {
  createHandler,
  parseNotification,
  type ChunkingDependencies,
} from "./chunking-function";

function notificationRecord(
  overrides: Partial<{ JobId: string; Status: string; S3ObjectName: string }> = {},
): SQSRecord {
  const message = {
    JobId: overrides.JobId ?? "job-1",
    Status: overrides.Status ?? "SUCCEEDED",
    DocumentLocation: { S3ObjectName: overrides.S3ObjectName ?? "1/document.pdf" },
  };

  return {
    messageId: "message-1",
    receiptHandle: "receipt",
    body: JSON.stringify({ Type: "Notification", Message: JSON.stringify(message) }),
    attributes: {
      ApproximateReceiveCount: "1",
      SentTimestamp: "0",
      SenderId: "sender",
      ApproximateFirstReceiveTimestamp: "0",
    },
    messageAttributes: {},
    md5OfBody: "md5",
    eventSource: "aws:sqs",
    eventSourceARN: "arn:aws:sqs:us-east-1:123:queue",
    awsRegion: "us-east-1",
  };
}

function event(record = notificationRecord()): SQSEvent {
  return { Records: [record] };
}

function textBlocks(text: string, page = 1): Block[] {
  return [
    {
      Id: `layout-${page}`,
      BlockType: "LAYOUT_TEXT",
      Page: page,
      Relationships: [{ Type: "CHILD", Ids: [`line-${page}`] }],
    },
    { Id: `line-${page}`, BlockType: "LINE", Page: page, Text: text },
  ];
}

function dependencies(
  overrides: Partial<ChunkingDependencies> = {},
): ChunkingDependencies {
  return {
    getDocumentAnalysis: vi.fn().mockResolvedValue({ Blocks: textBlocks("Document text") }),
    sendMessageBatch: vi.fn().mockImplementation(async (entries) => ({
      Successful: entries.map((entry: { Id: string }) => ({ Id: entry.Id })),
    })),
    getTrackingItem: vi.fn().mockResolvedValue(undefined),
    putTrackingItem: vi.fn().mockResolvedValue(undefined),
    countTokens: vi.fn().mockReturnValue(10),
    ...overrides,
  };
}

const config = () => ({
  queueUrl: "queue-url",
  tableName: "embedding-batches",
  chunkSize: 1_000,
  chunkOverlap: 400,
  tokenBatchSize: 8_192,
});

describe("chunking Lambda", () => {
  it("parses an SNS-wrapped Textract notification", () => {
    expect(parseNotification(notificationRecord())).toEqual({
      JobId: "job-1",
      Status: "SUCCEEDED",
      DocumentLocation: { S3ObjectName: "1/document.pdf" },
    });
  });

  it("paginates Textract results, sends chunks, and records tracking state", async () => {
    const getDocumentAnalysis = vi
      .fn()
      .mockResolvedValueOnce({ Blocks: textBlocks("First page"), NextToken: "page-2" })
      .mockResolvedValueOnce({ Blocks: textBlocks("Second page", 2) });
    const deps = dependencies({ getDocumentAnalysis });
    const handler = createHandler(deps, config);

    await expect(handler(event())).resolves.toEqual({ batchItemFailures: [] });

    expect(getDocumentAnalysis).toHaveBeenNthCalledWith(1, "job-1", undefined);
    expect(getDocumentAnalysis).toHaveBeenNthCalledWith(2, "job-1", "page-2");
    expect(deps.sendMessageBatch).toHaveBeenCalledOnce();
    const sentBody = JSON.parse(
      vi.mocked(deps.sendMessageBatch).mock.calls[0][0][0].MessageBody ?? "{}",
    );
    expect(sentBody).toMatchObject({
      document: "1/document.pdf",
      batchIndex: 0,
      totalBatches: 1,
    });
    expect(sentBody.batchId).toMatch(/^[a-f0-9]{64}$/);
    expect(deps.putTrackingItem).toHaveBeenCalledWith(
      expect.objectContaining({
        document: { S: "1/document.pdf" },
        status: { S: "processing" },
        total_batches: { N: "1" },
        processed_batches: { N: "0" },
        enqueue_completed: { BOOL: true },
      }),
      "embedding-batches",
    );
  });

  it("returns a batch failure for unsuccessful Textract jobs", async () => {
    const deps = dependencies();
    const handler = createHandler(deps, config);

    await expect(
      handler(event(notificationRecord({ Status: "FAILED" }))),
    ).resolves.toEqual({
      batchItemFailures: [{ itemIdentifier: "message-1" }],
    });
    expect(deps.getDocumentAnalysis).not.toHaveBeenCalled();
    expect(deps.putTrackingItem).not.toHaveBeenCalled();
  });

  it("retries only entries that SQS did not accept", async () => {
    const longText = Array.from({ length: 500 }, (_, index) => `word${index}`).join(" ");
    const sendMessageBatch = vi
      .fn()
      .mockImplementationOnce(async (entries) => ({
        Successful: [{ Id: entries[0].Id }],
        Failed: entries.slice(1).map((entry: { Id: string }) => ({
          Id: entry.Id,
          SenderFault: false,
          Code: "InternalError",
        })),
      }))
      .mockImplementationOnce(async (entries) => ({
        Successful: entries.map((entry: { Id: string }) => ({ Id: entry.Id })),
      }));
    const deps = dependencies({
      getDocumentAnalysis: vi.fn().mockResolvedValue({ Blocks: textBlocks(longText) }),
      countTokens: vi.fn().mockReturnValue(8_192),
      sendMessageBatch,
    });
    const handler = createHandler(deps, config);

    await expect(handler(event())).resolves.toEqual({ batchItemFailures: [] });

    expect(sendMessageBatch).toHaveBeenCalledTimes(2);
    const firstIds = sendMessageBatch.mock.calls[0][0].map(
      (entry: { Id: string }) => entry.Id,
    );
    const retriedIds = sendMessageBatch.mock.calls[1][0].map(
      (entry: { Id: string }) => entry.Id,
    );
    expect(retriedIds).toEqual(firstIds.slice(1));
  });

  it("sends the intended entries in groups of at most ten", async () => {
    const longText = Array.from({ length: 1_000 }, (_, index) => `word${index}`).join(" ");
    const deps = dependencies({
      getDocumentAnalysis: vi.fn().mockResolvedValue({ Blocks: textBlocks(longText) }),
      countTokens: vi.fn().mockReturnValue(8_192),
    });
    const handler = createHandler(deps, config);

    await expect(handler(event())).resolves.toEqual({ batchItemFailures: [] });

    const calls = vi.mocked(deps.sendMessageBatch).mock.calls;
    expect(calls.length).toBeGreaterThan(1);
    expect(calls.every(([entries]) => entries.length > 0 && entries.length <= 10)).toBe(true);

    const sentIds = calls.flatMap(([entries]) => entries.map((entry) => entry.Id));
    expect(sentIds).toEqual(sentIds.map((_, index) => String(index)));
  });

  it("skips a notification whose batches were already enqueued", async () => {
    const deps = dependencies({
      getTrackingItem: vi.fn().mockResolvedValue({
        job_id: { S: "job-1" },
        enqueue_completed: { BOOL: true },
      }),
    });
    const handler = createHandler(deps, config);

    await expect(handler(event())).resolves.toEqual({ batchItemFailures: [] });
    expect(deps.getDocumentAnalysis).not.toHaveBeenCalled();
    expect(deps.sendMessageBatch).not.toHaveBeenCalled();
  });

  it("fails defensively when Textract repeats a pagination token", async () => {
    const deps = dependencies({
      getDocumentAnalysis: vi.fn().mockResolvedValue({ Blocks: [], NextToken: "same" }),
    });
    const handler = createHandler(deps, config);

    await expect(handler(event())).resolves.toEqual({
      batchItemFailures: [{ itemIdentifier: "message-1" }],
    });
    expect(deps.getDocumentAnalysis).toHaveBeenCalledTimes(2);
  });
});
