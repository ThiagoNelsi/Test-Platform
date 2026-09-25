import type { UploadedObject } from "./s3-upload-event";

export type UploadResource = {
  id: number;
  documentId: string;
  objectKey: string;
  status: string;
};

export type UploadConfirmationPorts = {
  confirmPending: (objectKey: string) => Promise<void>;
  findByObjectKey: (objectKey: string) => Promise<UploadResource | undefined>;
  startProcessing: (objectKey: string) => Promise<string>;
  markProcessing: (id: number, jobId: string) => Promise<void>;
};

export function createUploadConfirmationProcessor(
  ports: UploadConfirmationPorts,
  expectedBucket?: string,
) {
  return async (object: UploadedObject): Promise<void> => {
    if (expectedBucket && object.bucket !== expectedBucket) {
      throw new Error(`Unexpected upload bucket ${object.bucket}`);
    }
    await ports.confirmPending(object.objectKey);
    const resource = await ports.findByObjectKey(object.objectKey);
    if (!resource) throw new Error(`Resource not found for object ${object.objectKey}`);

    if (resource.status !== "UPLOADED") {
      console.info("Upload notification already handled", {
        event: "upload.confirmation.skipped",
        documentId: resource.documentId,
        objectKey: object.objectKey,
        status: resource.status,
      });
      return;
    }

    const jobId = await ports.startProcessing(object.objectKey);
    await ports.markProcessing(resource.id, jobId);
    console.info("Upload confirmed and Textract started", {
      event: "upload.confirmed",
      documentId: resource.documentId,
      objectKey: object.objectKey,
      bucket: object.bucket,
      size: object.size,
      eTag: object.eTag,
      jobId,
    });
  };
}
