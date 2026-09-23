import type { DocumentChunk } from "../ingestion/chunking";

export type ChunkBatchMessage = {
  chunks: DocumentChunk[];
  document: string;
  batchId: string;
};

export type BatchClaim = "claimed" | "batch-completed" | "document-completed";
export type BatchCompletion = "processing" | "completed";

export type EmbeddingProcessorPorts = {
  claimBatch: (document: string, batchId: string) => Promise<BatchClaim>;
  releaseBatch: (document: string, batchId: string) => Promise<void>;
  createEmbeddings: (texts: string[]) => Promise<number[][]>;
  saveEmbeddings: (
    chunks: DocumentChunk[],
    embeddings: number[][],
    document: string,
  ) => Promise<void>;
  completeBatch: (document: string, batchId: string) => Promise<BatchCompletion>;
  markDocumentProcessed: (document: string) => Promise<void>;
};

export function createEmbeddingProcessor(ports: EmbeddingProcessorPorts) {
  return async (message: ChunkBatchMessage): Promise<void> => {
    const { chunks, document, batchId } = message;
    const claim = await ports.claimBatch(document, batchId);

    if (claim === "batch-completed") return;
    if (claim === "document-completed") {
      await ports.markDocumentProcessed(document);
      return;
    }

    let batchCompleted = false;
    try {
      const embeddings = await ports.createEmbeddings(chunks.map((chunk) => chunk.text));
      if (embeddings.length !== chunks.length) {
        throw new Error(
          `Embedding count mismatch: expected ${chunks.length}, received ${embeddings.length}`,
        );
      }

      await ports.saveEmbeddings(chunks, embeddings, document);
      const status = await ports.completeBatch(document, batchId);
      batchCompleted = true;

      if (status === "completed") {
        await ports.markDocumentProcessed(document);
      }
    } catch (error) {
      if (!batchCompleted) await ports.releaseBatch(document, batchId);
      throw error;
    }
  };
}
