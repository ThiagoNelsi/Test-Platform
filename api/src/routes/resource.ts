import { StartDocumentAnalysisCommand, type TextractClient } from '@aws-sdk/client-textract';
import type { PrismaClient, ResourceStatus } from '@prisma/client';
import type {
  CreateResourceRequest,
  CreateResourceResponse,
  ResourcesResponse,
} from 'api-contracts';
import { Router, type Request, type Response } from 'express';
import type { AuthService } from '../auth/service';
import { requireUser } from './shared/auth';
import { badRequest, internalServerError } from './shared/responses';
import { toResourceDto } from './shared/serializers';

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

export function createResourceRouter(options: ResourceRouterOptions): Router {
  const router = Router();

  router.post('/', async (req: Request, res: Response) => {
    const user = await requireUser(req, res, options.authService);
    if (!user) return;

    const { filename, fileType, objectKey, tags } =
      (req.body ?? {}) as Partial<CreateResourceRequest>;

    if (!filename || !fileType || !objectKey) {
      badRequest(res, 'Missing required fields');
      return;
    }

    if (!objectKey.startsWith(`${user.id}/`)) {
      res.status(403).json({ error: 'Invalid object ownership' });
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

      const textractResponse = await options.textractClient.send(command);

      await options.prisma.resource.update({
        where: {
          id: dbRef.id,
        },
        data: {
          status: 'PROCESSING',
          jobId: textractResponse.JobId,
        },
      });

      const response: CreateResourceResponse = {
        resource: toResourceDto(dbRef),
      };
      res.json(response);
    } catch (error) {
      internalServerError(res, error, 'Failed to create resource');
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

      const response: ResourcesResponse = {
        resources: resources.map(toResourceDto),
      };
      res.json(response);
    } catch (error) {
      internalServerError(res, error, 'Failed to fetch resources');
    }
  });

  return router;
}
