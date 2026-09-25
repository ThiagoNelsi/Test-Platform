import { createAwsUploadConfirmationProcessor } from "../adapters/aws-upload-confirmation";
import { createS3UploadHandler, type ProcessUploadedObject } from "../uploads/s3-upload-event";

let processor: Promise<ProcessUploadedObject> | undefined;

function getProcessor(): Promise<ProcessUploadedObject> {
  processor ??= createAwsUploadConfirmationProcessor().catch((error: unknown) => {
    processor = undefined;
    throw error;
  });
  return processor;
}

export const handler = createS3UploadHandler(async (object) => {
  await (await getProcessor())(object);
});
