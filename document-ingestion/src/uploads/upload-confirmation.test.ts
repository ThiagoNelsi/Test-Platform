import { describe, expect, it, vi } from "vitest";
import { createUploadConfirmationProcessor, type UploadConfirmationPorts } from "./upload-confirmation";

const object = {
  bucket: "uploads",
  objectKey: "1/document/file.pdf",
  eventName: "ObjectCreated:Put",
};

function ports(status = "UPLOADED"): UploadConfirmationPorts {
  return {
    confirmPending: vi.fn().mockResolvedValue(undefined),
    findByObjectKey: vi.fn().mockResolvedValue({
      id: 1, documentId: "document-id", objectKey: object.objectKey, status,
    }),
    startProcessing: vi.fn().mockResolvedValue("job-1"),
    markProcessing: vi.fn().mockResolvedValue(undefined),
  };
}

describe("upload confirmation processor", () => {
  it("confirms pending uploads before starting processing", async () => {
    const adapters = ports();
    await createUploadConfirmationProcessor(adapters)(object);
    expect(adapters.confirmPending).toHaveBeenCalledWith(object.objectKey);
    expect(adapters.startProcessing).toHaveBeenCalledWith(object.objectKey);
    expect(adapters.markProcessing).toHaveBeenCalledWith(1, "job-1");
    expect(vi.mocked(adapters.confirmPending).mock.invocationCallOrder[0])
      .toBeLessThan(vi.mocked(adapters.startProcessing).mock.invocationCallOrder[0]);
  });

  it.each(["PROCESSING", "PROCESSED", "FAILED"])(
    "does not regress or restart a %s resource",
    async (status) => {
      const adapters = ports(status);
      await createUploadConfirmationProcessor(adapters)(object);
      expect(adapters.startProcessing).not.toHaveBeenCalled();
      expect(adapters.markProcessing).not.toHaveBeenCalled();
    },
  );

  it("rejects notifications from another bucket", async () => {
    const adapters = ports();
    await expect(createUploadConfirmationProcessor(adapters, "expected-bucket")(object))
      .rejects.toThrow("Unexpected upload bucket");
    expect(adapters.confirmPending).not.toHaveBeenCalled();
  });

  it("fails so SQS can retry when the database record is absent", async () => {
    const adapters = ports();
    vi.mocked(adapters.findByObjectKey).mockResolvedValue(undefined);
    await expect(createUploadConfirmationProcessor(adapters)(object))
      .rejects.toThrow("Resource not found");
  });
});
