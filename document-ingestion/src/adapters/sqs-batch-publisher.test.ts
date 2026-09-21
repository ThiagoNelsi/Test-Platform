import { describe, expect, it, vi } from "vitest";
import type { ChunkBatch } from "../ingestion/chunking";
import { createSqsBatchPublisher } from "./sqs-batch-publisher";

function batches(count: number): ChunkBatch[] {
  return Array.from({ length: count }, (_, index) => ({
    chunks: [{ text: `chunk-${index}`, pages: [index + 1] }],
    size: 10,
  }));
}

describe("SQS chunk batch publisher", () => {
  it("publishes the existing message contract with stable identifiers", async () => {
    const sendBatch = vi.fn().mockImplementation(async (entries) => ({
      Successful: entries.map((entry: { Id: string }) => ({ Id: entry.Id })),
    }));
    const publish = createSqsBatchPublisher(sendBatch);
    const input = { jobId: "job-1", document: "1/document.pdf", batches: batches(1) };

    await publish(input);
    await publish(input);

    const firstBody = JSON.parse(sendBatch.mock.calls[0][0][0].MessageBody);
    const secondBody = JSON.parse(sendBatch.mock.calls[1][0][0].MessageBody);
    expect(firstBody).toMatchObject({
      chunks: input.batches[0].chunks,
      document: "1/document.pdf",
      batchIndex: 0,
      totalBatches: 1,
    });
    expect(firstBody.batchId).toMatch(/^[a-f0-9]{64}$/);
    expect(secondBody.batchId).toBe(firstBody.batchId);
  });

  it("retries only entries that SQS did not accept", async () => {
    const sendBatch = vi
      .fn()
      .mockImplementationOnce(async (entries) => ({
        Successful: [{ Id: entries[0].Id }],
        Failed: entries.slice(1).map((entry: { Id: string }) => ({
          Id: entry.Id,
          SenderFault: false,
        })),
      }))
      .mockImplementationOnce(async (entries) => ({
        Successful: entries.map((entry: { Id: string }) => ({ Id: entry.Id })),
      }));
    const publish = createSqsBatchPublisher(sendBatch);

    await publish({ jobId: "job-1", document: "document", batches: batches(3) });

    const firstIds = sendBatch.mock.calls[0][0].map((entry: { Id: string }) => entry.Id);
    const retriedIds = sendBatch.mock.calls[1][0].map((entry: { Id: string }) => entry.Id);
    expect(retriedIds).toEqual(firstIds.slice(1));
  });

  it("sends entries in non-empty groups of at most ten", async () => {
    const sendBatch = vi.fn().mockImplementation(async (entries) => ({
      Successful: entries.map((entry: { Id: string }) => ({ Id: entry.Id })),
    }));
    const publish = createSqsBatchPublisher(sendBatch);

    await publish({ jobId: "job-1", document: "document", batches: batches(14) });

    expect(sendBatch.mock.calls.map(([entries]) => entries.length)).toEqual([10, 4]);
    const sentIds = sendBatch.mock.calls.flatMap(([entries]) =>
      entries.map((entry: { Id: string }) => entry.Id),
    );
    expect(sentIds).toEqual(sentIds.map((_, index) => String(index)));
  });
});
