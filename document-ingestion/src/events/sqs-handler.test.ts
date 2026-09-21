import type { SQSRecord } from "aws-lambda";
import { describe, expect, it, vi } from "vitest";
import { createSqsHandler, parseNotification } from "./sqs-handler";

function record(status = "SUCCEEDED"): SQSRecord {
  const notification = {
    JobId: "job-1",
    Status: status,
    DocumentLocation: { S3ObjectName: "1/document.pdf" },
  };

  return {
    messageId: "message-1",
    receiptHandle: "receipt",
    body: JSON.stringify({ Message: JSON.stringify(notification) }),
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

describe("SQS handler", () => {
  it("parses an SNS-wrapped Textract notification", () => {
    expect(parseNotification(record())).toEqual({
      JobId: "job-1",
      Status: "SUCCEEDED",
      DocumentLocation: { S3ObjectName: "1/document.pdf" },
    });
  });

  it("processes records through the document processor interface", async () => {
    const processNotification = vi.fn().mockResolvedValue(undefined);
    const handler = createSqsHandler(processNotification);

    await expect(handler({ Records: [record()] })).resolves.toEqual({
      batchItemFailures: [],
    });
    expect(processNotification).toHaveBeenCalledWith(parseNotification(record()));
  });

  it("reports only records that fail", async () => {
    const processNotification = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("processing failed"));
    const handler = createSqsHandler(processNotification);
    const failedRecord = { ...record(), messageId: "message-2" };

    await expect(handler({ Records: [record(), failedRecord] })).resolves.toEqual({
      batchItemFailures: [{ itemIdentifier: "message-2" }],
    });
  });
});
