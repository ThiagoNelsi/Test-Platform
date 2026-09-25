import { describe, expect, it, vi } from "vitest";
import { createPendingUploadExpiration, type PendingUploadExpirationPorts } from "./pending-upload-expiration";

function ports(exists: boolean): PendingUploadExpirationPorts {
  return {
    listStale: vi.fn().mockResolvedValue([{
      id: 1, documentId: "document-id", objectKey: "1/document/file.pdf",
    }]),
    objectExists: vi.fn().mockResolvedValue(exists),
    reconcile: vi.fn().mockResolvedValue(undefined),
    expire: vi.fn().mockResolvedValue(undefined),
  };
}

describe("pending upload expiration", () => {
  it("reconciles stale records whose S3 object exists", async () => {
    const adapters = ports(true);
    await createPendingUploadExpiration(adapters, 24, () => new Date("2026-09-25T12:00:00Z"))();
    expect(adapters.reconcile).toHaveBeenCalledWith("1/document/file.pdf");
    expect(adapters.expire).not.toHaveBeenCalled();
  });

  it("expires only after checking that S3 has no object", async () => {
    const adapters = ports(false);
    await createPendingUploadExpiration(adapters, 24, () => new Date("2026-09-25T12:00:00Z"))();
    expect(adapters.objectExists).toHaveBeenCalledBefore(vi.mocked(adapters.expire));
    expect(adapters.expire).toHaveBeenCalledWith(1, new Date("2026-09-24T12:00:00Z"));
  });
});
