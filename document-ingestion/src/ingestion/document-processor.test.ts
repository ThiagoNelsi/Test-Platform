import type { Block } from "@aws-sdk/client-textract";
import { describe, expect, it, vi } from "vitest";
import {
  createDocumentProcessor,
  type DocumentProcessorPorts,
  type TextractNotification,
} from "./document-processor";

const notification: TextractNotification = {
  JobId: "job-1",
  Status: "SUCCEEDED",
  DocumentLocation: { S3ObjectName: "1/document.pdf" },
};

const blocks: Block[] = [
  {
    Id: "layout",
    BlockType: "LAYOUT_TEXT",
    Page: 1,
    Relationships: [{ Type: "CHILD", Ids: ["line"] }],
  },
  { Id: "line", BlockType: "LINE", Page: 1, Text: "Document text" },
];

function ports(overrides: Partial<DocumentProcessorPorts> = {}): DocumentProcessorPorts {
  return {
    loadBlocks: vi.fn().mockResolvedValue(blocks),
    batchesAlreadyEnqueued: vi.fn().mockResolvedValue(false),
    publishBatches: vi.fn().mockResolvedValue(undefined),
    markBatchesEnqueued: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("document processor", () => {
  it("loads, chunks, publishes, and records a successful document", async () => {
    const adapters = ports();
    const processDocument = createDocumentProcessor(adapters);

    await processDocument(notification);

    expect(adapters.loadBlocks).toHaveBeenCalledWith("job-1");
    expect(adapters.publishBatches).toHaveBeenCalledWith({
      jobId: "job-1",
      document: "1/document.pdf",
      batches: [
        {
          id: expect.any(String),
          chunks: [{ text: "Document text", pages: [1] }],
          size: expect.any(Number),
          pages: [1],
        },
      ],
    });
    expect(adapters.markBatchesEnqueued).toHaveBeenCalledWith(
      expect.objectContaining({
        document: "1/document.pdf",
        jobId: "job-1",
        totalBatches: 1,
        batches: [{ id: expect.any(String), status: "pending" }],
      }),
    );
    const published = vi.mocked(adapters.publishBatches).mock.calls[0][0].batches;
    const tracked = vi.mocked(adapters.markBatchesEnqueued).mock.calls[0][0].batches;
    expect(tracked[0].id).toBe(published[0].id);
  });

  it("rejects terminal Textract failures before calling adapters", async () => {
    const adapters = ports();
    const processDocument = createDocumentProcessor(adapters);

    await expect(processDocument({ ...notification, Status: "FAILED" })).rejects.toThrow(
      "Textract job job-1 finished with status FAILED",
    );
    expect(adapters.batchesAlreadyEnqueued).not.toHaveBeenCalled();
    expect(adapters.loadBlocks).not.toHaveBeenCalled();
  });

  it("skips documents whose batches are already enqueued", async () => {
    const adapters = ports({
      batchesAlreadyEnqueued: vi.fn().mockResolvedValue(true),
    });
    const processDocument = createDocumentProcessor(adapters);

    await processDocument(notification);

    expect(adapters.loadBlocks).not.toHaveBeenCalled();
    expect(adapters.publishBatches).not.toHaveBeenCalled();
    expect(adapters.markBatchesEnqueued).not.toHaveBeenCalled();
  });
});
