import { createAwsPendingUploadExpiration } from "../adapters/aws-upload-confirmation";

let expiration: Promise<() => Promise<void>> | undefined;

function getExpiration() {
  expiration ??= createAwsPendingUploadExpiration().catch((error: unknown) => {
    expiration = undefined;
    throw error;
  });
  return expiration;
}

export const handler = async (): Promise<void> => {
  await (await getExpiration())();
};
