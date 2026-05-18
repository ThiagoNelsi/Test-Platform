import { ListObjectsCommand, type S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { Router, type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

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
    const { contentType } = req.body ?? {};

    if (!contentType || typeof contentType !== 'string') {
      res.status(400).json({ error: 'Missing contentType' });
      return;
    }

    if (!options.bucketName) {
      res.status(500).json({ error: 'AWS bucket not configured' });
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

      res.json({ url, fields });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create presigned post';
      res.status(500).json({ error: message });
    }
  });

  router.get('/', async (_req: Request, res: Response) => {
    if (!options.bucketName) {
      res.status(500).json({ error: 'AWS bucket not configured' });
      return;
    }

    try {
      const response = await options.s3Client.send(
        new ListObjectsCommand({
          Bucket: options.bucketName,
        }),
      );

      res.json(response?.Contents ?? []);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list objects';
      res.status(500).json({ error: message });
    }
  });

  return router;
}
