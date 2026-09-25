import type { SQSEvent, SQSRecord } from "aws-lambda";
import { describe, expect, it, vi } from "vitest";
import { createS3UploadHandler, parseUploadedObjects } from "./s3-upload-event";

function sqsRecord(body: unknown, messageId = "message-1"): SQSRecord {
  return { body: JSON.stringify(body), messageId } as SQSRecord;
}

const notification = {
  Records: [{
    eventName: "ObjectCreated:Post",
    eventTime: "2026-09-25T12:00:00.000Z",
    s3: {
      bucket: { name: "uploads" },
      object: { key: "1%2Fdocument-id%2FHist%C3%B3ria+3.pdf", size: 42, eTag: "etag" },
    },
  }],
};

describe("S3 upload SQS handler", () => {
  it("decodes object keys from an S3 notification", () => {
    expect(parseUploadedObjects(sqsRecord(notification))).toEqual([{
      bucket: "uploads",
      objectKey: "1/document-id/História 3.pdf",
      size: 42,
      eTag: "etag",
      eventName: "ObjectCreated:Post",
      eventTime: "2026-09-25T12:00:00.000Z",
    }]);
  });

  it("reports only failed SQS messages for retry", async () => {
    const processObject = vi.fn()
      .mockRejectedValueOnce(new Error("database down"))
      .mockResolvedValueOnce(undefined);
    const handler = createS3UploadHandler(processObject);
    const response = await handler({ Records: [
      sqsRecord(notification, "failed"),
      sqsRecord(notification, "ok"),
    ] } as SQSEvent);
    expect(response).toEqual({ batchItemFailures: [{ itemIdentifier: "failed" }] });
    expect(processObject).toHaveBeenCalledTimes(2);
  });

  it("ignores the S3 destination validation event", () => {
    expect(parseUploadedObjects(sqsRecord({ Event: "s3:TestEvent" }))).toEqual([]);
  });
});
