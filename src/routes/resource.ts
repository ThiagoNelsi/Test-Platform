import { StartDocumentAnalysisCommand, type TextractClient } from '@aws-sdk/client-textract';
import type { PrismaClient, ResourceStatus } from '@prisma/client';
import { Router, type Request, type Response } from 'express';
import type { AuthService, BackendUser } from '../auth/service';

export type ResourcePrisma = Pick<PrismaClient, 'resource'>;

type ResourceRouterOptions = {
  authService: AuthService;
  prisma: ResourcePrisma;
  textractClient: TextractClient;
  bucketName: string;
  outputBucketName: string;
  snsTopicArn: string;
  snsRoleArn: string;
};

async function requireUser(
  req: Request,
  res: Response,
  authService: AuthService,
): Promise<BackendUser | null> {
  const token = req.cookies?.session as string | undefined;

  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  const user = await authService.getCurrentUser(token);

  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  return user;
}

export function createResourceRouter(options: ResourceRouterOptions): Router {
  const router = Router();

  router.post('/', async (req: Request, res: Response) => {
    const user = await requireUser(req, res, options.authService);
    if (!user) return;

    const { filename, fileType, objectKey, tags } = req.body ?? {};

    if (!filename || !fileType || !objectKey) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    try {
      const dbRef = await options.prisma.resource.create({
        data: {
          filename,
          fileType,
          tags: Array.isArray(tags) ? tags : [],
          objectKey,
          ownerId: user.id,
          status: 'UPLOADED',
        },
      });

      const command = new StartDocumentAnalysisCommand({
        FeatureTypes: ['LAYOUT'],
        DocumentLocation: {
          S3Object: {
            Bucket: options.bucketName,
            Name: objectKey,
          },
        },
        OutputConfig: {
          S3Bucket: options.outputBucketName,
        },
        ClientRequestToken: objectKey,
        NotificationChannel: {
          SNSTopicArn: options.snsTopicArn,
          RoleArn: options.snsRoleArn,
        },
      });

      const response = await options.textractClient.send(command);

      await options.prisma.resource.update({
        where: {
          id: dbRef.id,
        },
        data: {
          status: 'PROCESSING',
          jobId: response.JobId,
        },
      });

      res.json({ resource: dbRef });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create resource';
      res.status(500).json({ error: message });
    }
  });

  router.get('/', async (req: Request, res: Response) => {
    const user = await requireUser(req, res, options.authService);
    if (!user) return;

    const status = req.query.status as ResourceStatus | undefined;

    try {
      const resources = await options.prisma.resource.findMany({
        where: {
          ownerId: user.id,
          deletedAt: null,
          ...(status ? { status } : {}),
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      res.json({ resources });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch resources';
      res.status(500).json({ error: message });
    }
  });

  return router;
}
