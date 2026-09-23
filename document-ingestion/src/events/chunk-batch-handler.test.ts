import type { SQSRecord } from "aws-lambda";
import { describe, expect, it, vi } from "vitest";
import { createChunkBatchHandler, parseChunkBatch } from "./chunk-batch-handler";

function record(messageId = "message-1"): SQSRecord {
  return {
    messageId,
    receiptHandle: "receipt",
    body: JSON.stringify({
      document: "1/document.pdf",
      batchId: "batch-1",
      chunks: [{ text: "chunk", pages: [1] }],
    }),
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

describe("chunk batch handler", () => {
  it("parses a chunk batch", () => {
    expect(parseChunkBatch(record())).toEqual({
      document: "1/document.pdf",
      batchId: "batch-1",
      chunks: [{ text: "chunk", pages: [1] }],
    });
  });

  it("reports only records that fail", async () => {
    const processBatch = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("processing failed"));
    const handler = createChunkBatchHandler(processBatch);

    await expect(handler({ Records: [record(), record("message-2")] })).resolves.toEqual({
      batchItemFailures: [{ itemIdentifier: "message-2" }],
    });
  });

  it("rejects malformed messages", () => {
    expect(() => parseChunkBatch({ ...record(), body: "{}" })).toThrow(
      "Invalid chunk batch message",
    );
  });
});
