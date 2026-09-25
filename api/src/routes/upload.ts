import {
  HeadObjectCommand,
  ListObjectsCommand,
  type S3Client,
} from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import type { PrismaClient } from '@prisma/client';
import type {
  CreateUploadRequest,
  CreateUploadResponse,
  PresignedPostResponse,
  UploadObjectsResponse,
} from 'api-contracts';
import { Router, type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { AuthService } from '../auth/service';
import type { ResourceProcessingOptions } from '../services/resource-processing';
import { confirmUploadAndStartProcessing } from '../services/resource-processing';
import { requireUser } from './shared/auth';
import { badRequest, internalServerError } from './shared/responses';
import { toResourceDto } from './shared/serializers';

export type PresignedPostResult = {
  url: string;
  fields: Record<string, string>;
};

type PresignedPostFactory = typeof createPresignedPost;
type UploadPrisma = Pick<PrismaClient, 'resource'>;

type UploadRouterOptions = {
  authService: AuthService;
  bucketName: string;
  region: string;
  s3Client: S3Client;
  prisma?: UploadPrisma;
  processing?: Omit<ResourceProcessingOptions, 'prisma' | 'bucketName'>;
  presignPost?: PresignedPostFactory;
  maxSizeBytes?: number;
  expiresSeconds?: number;
};

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const ACTIVE_STATUSES = ['PENDING_UPLOAD', 'UPLOADED', 'PROCESSING', 'PROCESSED'] as const;

function safeFilename(filename: string): string {
  const basename = filename.split(/[\\/]/).pop()?.trim() ?? '';
  return basename.replace(/[\u0000-\u001f\u007f]/g, '_').slice(0, 255);
}

function isNotFound(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return candidate.name === 'NotFound' || candidate.name === 'NoSuchKey' ||
    candidate.$metadata?.httpStatusCode === 404;
}

function isUniqueConflict(error: unknown): boolean {
  return !!error && typeof error === 'object' && 'code' in error && error.code === 'P2002';
}

export function createUploadRouter(options: UploadRouterOptions): Router {
  const router = Router();
  const presignPost = options.presignPost ?? createPresignedPost;
  const maxSizeBytes = options.maxSizeBytes ?? 10 * 1024 * 1024;
  const expiresSeconds = options.expiresSeconds ?? 900;

  async function createPresignedResponse(
    resource: { documentId: string; objectKey: string; fileType: string },
    status: PresignedPostResponse['status'],
  ): Promise<PresignedPostResponse> {
    const { url, fields } = await presignPost(options.s3Client, {
      Bucket: options.bucketName,
      Key: resource.objectKey,
      Conditions: [
        ['content-length-range', 1, maxSizeBytes],
        ['eq', '$Content-Type', resource.fileType],
      ],
      Fields: { 'Content-Type': resource.fileType },
      Expires: expiresSeconds,
    });
    const expiresAt = new Date(Date.now() + expiresSeconds * 1_000).toISOString();
    return { status, documentId: resource.documentId, uploadUrl: url, url, fields, expiresAt };
  }

  router.post('/', async (req: Request, res: Response) => {
    const user = await requireUser(req, res, options.authService);
    if (!user) return;

    const body = (req.body ?? {}) as Partial<CreateUploadRequest>;
    const filename = typeof body.filename === 'string' ? safeFilename(body.filename) : '';
    const contentType = typeof body.contentType === 'string' ? body.contentType.trim() : '';
    const fileHash = typeof body.fileHash === 'string' ? body.fileHash.toLowerCase() : '';
    const fileSize = body.fileSize;
    const tags = Array.isArray(body.tags) && body.tags.every((tag) => typeof tag === 'string')
      ? body.tags
      : [];

    if (!filename || !contentType || !Number.isInteger(fileSize) || (fileSize ?? 0) <= 0) {
      badRequest(res, 'Missing or invalid file metadata');
      return;
    }
    if ((fileSize ?? 0) > maxSizeBytes) {
      badRequest(res, `File exceeds the ${maxSizeBytes} byte upload limit`);
      return;
    }
    if (!SHA256_PATTERN.test(fileHash)) {
      badRequest(res, 'fileHash must be a lowercase SHA-256 hex digest');
      return;
    }
    if (!options.bucketName) {
      internalServerError(res, undefined, 'AWS bucket not configured');
      return;
    }
    if (!options.prisma) {
      internalServerError(res, undefined, 'Upload database not configured');
      return;
    }

    try {
      let createdNewResource = false;
      let resource = await options.prisma.resource.findFirst({
        where: {
          ownerId: user.id,
          fileHash,
          deletedAt: null,
          status: { in: [...ACTIVE_STATUSES] },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!resource) {
        const documentId = uuidv4();
        const objectKey = `${user.id}/${documentId}/${filename}`;
        try {
          resource = await options.prisma.resource.create({
            data: {
              documentId,
              filename,
              fileType: contentType,
              fileSize,
              fileHash,
              tags,
              objectKey,
              ownerId: user.id,
              status: 'PENDING_UPLOAD',
            },
          });
          createdNewResource = true;
          console.info('Pending upload created', {
            event: 'upload.requested', documentId, objectKey, ownerId: user.id,
          });
        } catch (error) {
          if (!isUniqueConflict(error)) throw error;
          resource = await options.prisma.resource.findFirst({
            where: {
              ownerId: user.id,
              fileHash,
              deletedAt: null,
              status: { in: [...ACTIVE_STATUSES] },
            },
            orderBy: { createdAt: 'desc' },
          });
          if (!resource) throw error;
        }
      }

      let response: CreateUploadResponse;
      if (resource.status !== 'PENDING_UPLOAD') {
        response = { status: 'ALREADY_EXISTS', document: toResourceDto(resource) };
      } else {
        let exists = false;
        if (!createdNewResource) {
          try {
            await options.s3Client.send(new HeadObjectCommand({
              Bucket: options.bucketName,
              Key: resource.objectKey,
            }));
            exists = true;
          } catch (error) {
            if (!isNotFound(error)) throw error;
          }
        }

        if (!exists) {
          if (!createdNewResource) {
            resource = await options.prisma.resource.update({
              where: { id: resource.id },
              data: { updatedAt: new Date() },
            });
          }
          response = await createPresignedResponse(
            resource,
            createdNewResource ? 'NEW_UPLOAD' : 'RESUME_UPLOAD',
          );
        } else {
          if (!options.processing) throw new Error('Resource processing not configured');
          const reconciled = await confirmUploadAndStartProcessing(resource.objectKey, {
            ...options.processing,
            prisma: options.prisma,
            bucketName: options.bucketName,
          });
          response = {
            status: 'UPLOAD_ALREADY_COMPLETED',
            document: toResourceDto(reconciled),
          };
        }
      }

      res.json(response);
    } catch (error) {
      internalServerError(res, error, 'Failed to prepare upload');
    }
  });

  router.get('/', async (req: Request, res: Response) => {
    const user = await requireUser(req, res, options.authService);
    if (!user) return;
    if (!options.bucketName) {
      internalServerError(res, undefined, 'AWS bucket not configured');
      return;
    }

    try {
      const response = await options.s3Client.send(new ListObjectsCommand({
        Bucket: options.bucketName,
        Prefix: `${user.id}/`,
      }));
      const objects: UploadObjectsResponse = (response.Contents ?? [])
        .flatMap((object) => object.Key ? [{ Key: object.Key }] : []);
      res.json(objects);
    } catch (error) {
      internalServerError(res, error, 'Failed to list objects');
    }
  });

  return router;
}
