import type { Block } from "@aws-sdk/client-textract";
import { countEmbeddingTokens, createBatches, type ChunkBatch } from "./chunking";
import { createStructuredChunks } from "./structured-chunking";

export type TextractNotification = {
  JobId: string;
  Status: string;
  DocumentLocation: {
    S3ObjectName: string;
  };
};

export type BatchTrackingRecord = {
  document: string;
  jobId: string;
  batches: { id: string; status: "pending" }[];
  totalBatches: number;
  updatedAt: string;
};

export type DocumentProcessorPorts = {
  loadBlocks: (jobId: string) => Promise<Block[]>;
  batchesAlreadyEnqueued: (document: string, jobId: string) => Promise<boolean>;
  publishBatches: (input: {
    jobId: string;
    document: string;
    batches: ChunkBatch[];
  }) => Promise<void>;
  markBatchesEnqueued: (record: BatchTrackingRecord) => Promise<void>;
};

type ChunkingOptions = {
  tokenBatchSize: number;
};

const defaultOptions: ChunkingOptions = {
  tokenBatchSize: 8_192,
};

export function createDocumentProcessor(
  ports: DocumentProcessorPorts,
  options: ChunkingOptions = defaultOptions,
) {
  return async (notification: TextractNotification): Promise<void> => {
    const { JobId: jobId, Status: status } = notification;
    const document = notification.DocumentLocation.S3ObjectName;

    console.log("Processing Textract notification", { jobId, document, status });

    if (status !== "SUCCEEDED") {
      // TODO: handle failed jobs, e.g., by immediately sending a message to a dead-letter queue
      throw new Error(`Textract job ${jobId} finished with status ${status}`);
    }

    if (await ports.batchesAlreadyEnqueued(document, jobId)) {
      console.log("Chunk batches were already enqueued", { jobId, document });
      return;
    }

    const blocks = await ports.loadBlocks(jobId);
    const { parents, children: chunks } = createStructuredChunks(blocks, document);
    if (chunks.length === 0) throw new Error(`Textract job ${jobId} produced no indexable text`);
    const batches = createBatches(chunks, options.tokenBatchSize, countEmbeddingTokens, jobId, parents);

    console.log("Document chunking complete", {
      jobId,
      document,
      chunks: chunks.length,
      batches: batches.length,
    });

    await ports.publishBatches({ jobId, document, batches });
    await ports.markBatchesEnqueued({
      document,
      jobId,
      totalBatches: batches.length,
      batches: batches.map((batch) => ({ id: batch.id, status: "pending" })),
      updatedAt: new Date().toISOString(),
    });
  };
}
