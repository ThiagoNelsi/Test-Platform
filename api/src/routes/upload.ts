import { ListObjectsCommand, type S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import type {
  CreateUploadRequest,
  PresignedPostResponse,
  UploadObjectsResponse,
} from 'api-contracts';
import { Router, type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { badRequest, internalServerError } from './shared/responses';

export type PresignedPostResult = {
  url: string;
  fields: Record<string, string>;
};

type PresignedPostFactory = typeof createPresignedPost;

type UploadRouterOptions = {
  bucketName: string;
  region: string;
  s3Client: S3Client;
  presignPost?: PresignedPostFactory;
  maxSizeBytes?: number;
  expiresSeconds?: number;
};

export function createUploadRouter(options: UploadRouterOptions): Router {
  const router = Router();
  const presignPost = options.presignPost ?? createPresignedPost;
  const maxSizeBytes = options.maxSizeBytes ?? 10 * 1024 * 1024;
  const expiresSeconds = options.expiresSeconds ?? 600;

  router.post('/', async (req: Request, res: Response) => {
    const { contentType } = (req.body ?? {}) as Partial<CreateUploadRequest>;

    if (!contentType || typeof contentType !== 'string') {
      badRequest(res, 'Missing contentType');
      return;
    }

    if (!options.bucketName) {
      internalServerError(res, undefined, 'AWS bucket not configured');
      return;
    }

    try {
      const { url, fields } = await presignPost(options.s3Client, {
        Bucket: options.bucketName,
        Key: uuidv4(),
        Conditions: [
          ['content-length-range', 0, maxSizeBytes],
          ['starts-with', '$Content-Type', contentType],
        ],
        Fields: {
          acl: 'public-read',
          'Content-Type': contentType,
        },
        Expires: expiresSeconds,
      });

      const response: PresignedPostResponse = { url, fields };
      res.json(response);
    } catch (error) {
      internalServerError(res, error, 'Failed to create presigned post');
    }
  });

  router.get('/', async (_req: Request, res: Response) => {
    if (!options.bucketName) {
      internalServerError(res, undefined, 'AWS bucket not configured');
      return;
    }

    try {
      const response = await options.s3Client.send(
        new ListObjectsCommand({
          Bucket: options.bucketName,
        }),
      );

      const objects: UploadObjectsResponse = (response?.Contents ?? []).map(
        (object) => ({ Key: object.Key }),
      );
      res.json(objects);
    } catch (error) {
      internalServerError(res, error, 'Failed to list objects');
    }
  });

  return router;
}
