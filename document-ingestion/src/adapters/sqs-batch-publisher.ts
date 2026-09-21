import { createHash } from "node:crypto";
import type { SendMessageBatchRequestEntry } from "@aws-sdk/client-sqs";
import type { ChunkBatch } from "../ingestion/chunking";

type SendBatchResult = {
  Successful?: Array<{ Id?: string }>;
  Failed?: Array<{ Id?: string; SenderFault?: boolean; Code?: string; Message?: string }>;
};

export type SendBatch = (
  entries: SendMessageBatchRequestEntry[],
) => Promise<SendBatchResult>;

export type PublishChunkBatchesInput = {
  jobId: string;
  document: string;
  batches: ChunkBatch[];
};

function stableBatchId(jobId: string, index: number, batch: ChunkBatch): string {
  return createHash("sha256")
    .update(`${jobId}:${index}:${JSON.stringify(batch.chunks)}`)
    .digest("hex");
}

function createEntries(input: PublishChunkBatchesInput): SendMessageBatchRequestEntry[] {
  return input.batches.map((batch, index) => ({
    Id: String(index),
    MessageBody: JSON.stringify({
      chunks: batch.chunks,
      document: input.document,
      batchId: stableBatchId(input.jobId, index, batch),
      batchIndex: index,
      totalBatches: input.batches.length,
    }),
  }));
}

async function sendGroup(
  group: SendMessageBatchRequestEntry[],
  sendBatch: SendBatch,
): Promise<void> {
  let pending = group;

  for (let attempt = 1; pending.length > 0 && attempt <= 3; attempt += 1) {
    const result = await sendBatch(pending);
    const successfulIds = new Set(
      (result.Successful ?? []).flatMap((entry) => (entry.Id ? [entry.Id] : [])),
    );
    const senderFault = (result.Failed ?? []).find((failure) => failure.SenderFault);

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

export function createSqsBatchPublisher(sendBatch: SendBatch) {
  return async (input: PublishChunkBatchesInput): Promise<void> => {
    const entries = createEntries(input);

    for (let offset = 0; offset < entries.length; offset += 10) {
      await sendGroup(entries.slice(offset, offset + 10), sendBatch);
    }
  };
}
