import type { SQSBatchResponse, SQSEvent, SQSRecord } from "aws-lambda";

export type UploadedObject = {
  bucket: string;
  objectKey: string;
  size?: number;
  eTag?: string;
  eventName: string;
  eventTime?: string;
};

export type ProcessUploadedObject = (object: UploadedObject) => Promise<void>;

export function parseUploadedObjects(record: SQSRecord): UploadedObject[] {
  const payload = JSON.parse(record.body) as {
    Event?: string;
    Records?: Array<{
      eventName?: string;
      eventTime?: string;
      s3?: {
        bucket?: { name?: string };
        object?: { key?: string; size?: number; eTag?: string };
      };
    }>;
  };

  if (payload.Event === "s3:TestEvent") return [];
  if (!Array.isArray(payload.Records)) throw new Error("Invalid S3 notification");

  return payload.Records.map((event) => {
    const bucket = event.s3?.bucket?.name;
    const encodedKey = event.s3?.object?.key;
    if (!bucket || !encodedKey || !event.eventName?.startsWith("ObjectCreated:")) {
      throw new Error("Invalid S3 object-created record");
    }
    return {
      bucket,
      objectKey: decodeURIComponent(encodedKey.replace(/\+/g, " ")),
      size: event.s3?.object?.size,
      eTag: event.s3?.object?.eTag,
      eventName: event.eventName,
      eventTime: event.eventTime,
    };
  });
}

export function createS3UploadHandler(processObject: ProcessUploadedObject) {
  return async (event: SQSEvent): Promise<SQSBatchResponse> => {
    const batchItemFailures: SQSBatchResponse["batchItemFailures"] = [];

    for (const record of event.Records) {
      try {
        for (const object of parseUploadedObjects(record)) await processObject(object);
      } catch (error) {
        console.error("Upload confirmation failed", {
          event: "upload.confirmation.failed",
          messageId: record.messageId,
          error,
        });
        batchItemFailures.push({ itemIdentifier: record.messageId });
      }
    }

    return { batchItemFailures };
  };
}
