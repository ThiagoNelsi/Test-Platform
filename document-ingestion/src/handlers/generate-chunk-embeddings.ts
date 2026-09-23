import { createAwsEmbeddingProcessor } from "../adapters/aws-embedding-adapters";
import { loadAwsRuntimeSecrets } from "../adapters/runtime-secrets";
import { createChunkBatchHandler } from "../events/chunk-batch-handler";
import type { ProcessChunkBatch } from "../events/chunk-batch-handler";

let processor: Promise<ProcessChunkBatch> | undefined;

function getProcessor(): Promise<ProcessChunkBatch> {
  processor ??= loadAwsRuntimeSecrets().then(createAwsEmbeddingProcessor).catch((error: unknown) => {
    processor = undefined;
    throw error;
  });
  return processor;
}

export const handler = createChunkBatchHandler(async (message) => {
  await (await getProcessor())(message);
});
