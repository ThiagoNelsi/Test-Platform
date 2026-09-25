import { StartDocumentAnalysisCommand, type TextractClient } from '@aws-sdk/client-textract';
import { createHash } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';

export type ProcessingPrisma = Pick<PrismaClient, 'resource'>;

export type ResourceProcessingOptions = {
  prisma: ProcessingPrisma;
  textractClient: TextractClient;
  bucketName: string;
  outputBucketName: string;
  snsTopicArn: string;
  snsRoleArn: string;
};

export async function confirmUploadAndStartProcessing(
  objectKey: string,
  options: ResourceProcessingOptions,
) {
  await options.prisma.resource.updateMany({
    where: { objectKey, status: 'PENDING_UPLOAD' },
    data: { status: 'UPLOADED' },
  });

  const resource = await options.prisma.resource.findUnique({ where: { objectKey } });
  if (!resource) throw new Error(`Resource not found for object ${objectKey}`);

  if (resource.status !== 'UPLOADED') {
    console.info('Upload event already handled', {
      event: 'upload.confirmation.skipped',
      documentId: resource.documentId,
      objectKey,
      status: resource.status,
    });
    return resource;
  }

  const response = await options.textractClient.send(
    new StartDocumentAnalysisCommand({
      FeatureTypes: ['LAYOUT'],
      DocumentLocation: { S3Object: { Bucket: options.bucketName, Name: objectKey } },
      OutputConfig: { S3Bucket: options.outputBucketName },
      ClientRequestToken: createHash('sha256').update(objectKey).digest('hex'),
      NotificationChannel: {
        SNSTopicArn: options.snsTopicArn,
        RoleArn: options.snsRoleArn,
      },
    }),
  );

  if (!response.JobId) throw new Error(`Textract did not return a job id for ${objectKey}`);

  await options.prisma.resource.updateMany({
    where: { id: resource.id, status: 'UPLOADED' },
    data: { status: 'PROCESSING', jobId: response.JobId },
  });

  const updated = await options.prisma.resource.findUnique({ where: { objectKey } });
  if (!updated) throw new Error(`Resource disappeared while processing ${objectKey}`);

  console.info('Upload confirmed and processing started', {
    event: 'upload.confirmed',
    documentId: updated.documentId,
    objectKey,
    jobId: updated.jobId,
    status: updated.status,
  });
  return updated;
}
