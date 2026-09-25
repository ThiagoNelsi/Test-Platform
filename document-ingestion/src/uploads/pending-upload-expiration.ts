export type StalePendingUpload = {
  id: number;
  documentId: string;
  objectKey: string;
};

export type PendingUploadExpirationPorts = {
  listStale: (cutoff: Date) => Promise<StalePendingUpload[]>;
  objectExists: (objectKey: string) => Promise<boolean>;
  reconcile: (objectKey: string) => Promise<void>;
  expire: (id: number, cutoff: Date) => Promise<void>;
};

export function createPendingUploadExpiration(
  ports: PendingUploadExpirationPorts,
  expirationHours: number,
  now: () => Date = () => new Date(),
) {
  if (!Number.isFinite(expirationHours) || expirationHours <= 0) {
    throw new Error("PENDING_UPLOAD_EXPIRATION_HOURS must be positive");
  }

  return async (): Promise<void> => {
    const cutoff = new Date(now().getTime() - expirationHours * 60 * 60 * 1_000);
    const pending = await ports.listStale(cutoff);

    for (const resource of pending) {
      if (await ports.objectExists(resource.objectKey)) {
        await ports.reconcile(resource.objectKey);
        continue;
      }
      await ports.expire(resource.id, cutoff);
      console.info("Pending upload expired", {
        event: "upload.expired",
        documentId: resource.documentId,
        objectKey: resource.objectKey,
      });
    }
  };
}
