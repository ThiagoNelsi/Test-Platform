import type { SQSBatchResponse, SQSEvent, SQSRecord } from "aws-lambda";
import type { TextractNotification } from "../ingestion/document-processor";

export type ProcessNotification = (notification: TextractNotification) => Promise<void>;

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

export function createSqsHandler(processNotification: ProcessNotification) {
  return async (event: SQSEvent): Promise<SQSBatchResponse> => {
    const batchItemFailures: SQSBatchResponse["batchItemFailures"] = [];

    for (const record of event.Records) {
      try {
        await processNotification(parseNotification(record));
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
