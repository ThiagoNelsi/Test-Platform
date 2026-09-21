import type { Block } from "@aws-sdk/client-textract";
import { countEmbeddingTokens, createBatches, splitText, type ChunkBatch } from "./chunking";
import { linearizeLayout } from "./linearize-layout";

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
  chunkSize: number;
  chunkOverlap: number;
  tokenBatchSize: number;
};

const defaultOptions: ChunkingOptions = {
  chunkSize: 1_000,
  chunkOverlap: 400,
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
      throw new Error(`Textract job ${jobId} finished with status ${status}`);
    }

    if (await ports.batchesAlreadyEnqueued(document, jobId)) {
      console.log("Chunk batches were already enqueued", { jobId, document });
      return;
    }

    const blocks = await ports.loadBlocks(jobId);
    const pages = linearizeLayout(blocks);
    const chunks = splitText(pages, options.chunkSize, options.chunkOverlap);
    const batches = createBatches(chunks, options.tokenBatchSize, countEmbeddingTokens);

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
      updatedAt: new Date().toISOString(),
    });
  };
}
