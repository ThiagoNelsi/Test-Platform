import type { SQSBatchResponse, SQSEvent, SQSRecord } from "aws-lambda";
import type { ChunkBatchMessage } from "../embeddings/embedding-processor";

export type ProcessChunkBatch = (message: ChunkBatchMessage) => Promise<void>;

export function parseChunkBatch(record: SQSRecord): ChunkBatchMessage {
  const body = JSON.parse(record.body) as Partial<ChunkBatchMessage>;

  if (
    typeof body.document !== "string" ||
    typeof body.batchId !== "string" ||
    !Array.isArray(body.chunks) ||
    body.chunks.some(
      (chunk) =>
        typeof chunk !== "object" ||
        chunk === null ||
        typeof chunk.text !== "string" ||
        !Array.isArray(chunk.pages) ||
        chunk.pages.some((page) => typeof page !== "number"),
    )
  ) {
    throw new Error("Invalid chunk batch message");
  }

  return body as ChunkBatchMessage;
}

export function createChunkBatchHandler(processChunkBatch: ProcessChunkBatch) {
  return async (event: SQSEvent): Promise<SQSBatchResponse> => {
    const batchItemFailures: SQSBatchResponse["batchItemFailures"] = [];

    for (const record of event.Records) {
      try {
        await processChunkBatch(parseChunkBatch(record));
      } catch (error) {
        console.error("Chunk embedding generation failed", {
          messageId: record.messageId,
          error,
        });
        batchItemFailures.push({ itemIdentifier: record.messageId });
      }
    }

    return { batchItemFailures };
  };
}
