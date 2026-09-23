import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createEmbeddingProcessor,
  type ChunkBatchMessage,
  type EmbeddingProcessorPorts,
} from "./embedding-processor";

const message: ChunkBatchMessage = {
  document: "1/document.pdf",
  batchId: "batch-1",
  chunks: [{ text: "first chunk", pages: [1] }],
};

function ports(): EmbeddingProcessorPorts {
  return {
    claimBatch: vi.fn().mockResolvedValue("claimed"),
    releaseBatch: vi.fn().mockResolvedValue(undefined),
    createEmbeddings: vi.fn().mockResolvedValue([[0.1, 0.2]]),
    saveEmbeddings: vi.fn().mockResolvedValue(undefined),
    completeBatch: vi.fn().mockResolvedValue("processing"),
    markDocumentProcessed: vi.fn().mockResolvedValue(undefined),
  };
}

describe("embedding processor", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates and persists embeddings before completing the batch", async () => {
    const adapters = ports();
    await createEmbeddingProcessor(adapters)(message);

    expect(adapters.createEmbeddings).toHaveBeenCalledWith(["first chunk"]);
    expect(adapters.saveEmbeddings).toHaveBeenCalledWith(
      message.chunks,
      [[0.1, 0.2]],
      message.document,
    );
    expect(adapters.completeBatch).toHaveBeenCalledWith(message.document, message.batchId);
    expect(adapters.markDocumentProcessed).not.toHaveBeenCalled();
  });

  it("marks the resource processed when the final batch completes", async () => {
    const adapters = ports();
    vi.mocked(adapters.completeBatch).mockResolvedValue("completed");

    await createEmbeddingProcessor(adapters)(message);

    expect(adapters.markDocumentProcessed).toHaveBeenCalledWith(message.document);
  });

  it("releases a claimed batch when embedding work fails", async () => {
    const adapters = ports();
    vi.mocked(adapters.createEmbeddings).mockRejectedValue(new Error("OpenAI unavailable"));

    await expect(createEmbeddingProcessor(adapters)(message)).rejects.toThrow("OpenAI unavailable");
    expect(adapters.releaseBatch).toHaveBeenCalledWith(message.document, message.batchId);
  });

  it("retries the resource update for an already completed document", async () => {
    const adapters = ports();
    vi.mocked(adapters.claimBatch).mockResolvedValue("document-completed");

    await createEmbeddingProcessor(adapters)(message);

    expect(adapters.createEmbeddings).not.toHaveBeenCalled();
    expect(adapters.markDocumentProcessed).toHaveBeenCalledWith(message.document);
  });
});
