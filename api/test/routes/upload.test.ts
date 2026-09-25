import { HeadObjectCommand, ListObjectsCommand } from '@aws-sdk/client-s3';
import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createUploadRouter } from '../../src/routes/upload';

const HASH = 'a'.repeat(64);
const now = new Date('2026-09-25T12:00:00Z');

function resource(overrides: Record<string, unknown> = {}) {
  return {
    id: 11,
    documentId: '550e8400-e29b-41d4-a716-446655440000',
    filename: 'file.pdf',
    fileType: 'application/pdf',
    fileSize: 123,
    fileHash: HASH,
    tags: ['history'],
    objectKey: '1/550e8400-e29b-41d4-a716-446655440000/file.pdf',
    jobId: null,
    status: 'PENDING_UPLOAD',
    ownerId: 1,
    createdAt: now,
    updatedAt: now,
    processedAt: null,
    deletedAt: null,
    ...overrides,
  };
}

function createAuthServiceStub(userId: number | null = 1) {
  return {
    getCurrentUser: vi.fn().mockResolvedValue(userId ? {
      id: userId, name: 'User', email: 'user@example.com', image: null, googleSub: null,
    } : null),
  };
}

function createTestApp(options: {
  existing?: ReturnType<typeof resource> | null;
  headExists?: boolean;
  userId?: number | null;
  bucketName?: string;
} = {}) {
  const existing = options.existing ?? null;
  const created = resource();
  const prisma = {
    resource: {
      findFirst: vi.fn().mockResolvedValue(existing),
      create: vi.fn().mockResolvedValue(created),
      update: vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve(resource({ ...(existing ?? {}), ...data }))),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findUnique: vi.fn()
        .mockResolvedValueOnce(resource({ status: 'UPLOADED' }))
        .mockResolvedValue(resource({ status: 'PROCESSING', jobId: 'job-1' })),
    },
  };
  const presignPost = vi.fn().mockResolvedValue({
    url: 'http://s3.local/post', fields: { key: created.objectKey },
  });
  const s3Client = {
    send: vi.fn().mockImplementation((command: unknown) => {
      if (command instanceof ListObjectsCommand) return { Contents: [{ Key: '1/file-1' }] };
      if (command instanceof HeadObjectCommand && options.headExists) return {};
      const error = new Error('not found');
      error.name = 'NotFound';
      throw error;
    }),
  };
  const textractClient = { send: vi.fn().mockResolvedValue({ JobId: 'job-1' }) };
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/api/upload', createUploadRouter({
    authService: createAuthServiceStub(options.userId === undefined ? 1 : options.userId) as never,
    bucketName: options.bucketName === undefined ? 'bucket-name' : options.bucketName,
    region: 'us-east-1',
    s3Client: s3Client as never,
    prisma: prisma as never,
    processing: {
      textractClient: textractClient as never,
      outputBucketName: 'output-bucket',
      snsTopicArn: 'topic-arn',
      snsRoleArn: 'role-arn',
    },
    presignPost,
  }));
  return { app, presignPost, prisma, s3Client, textractClient, created };
}

function postUpload(app: express.Express) {
  return request(app).post('/api/upload').set('Cookie', ['session=session-token']).send({
    filename: 'file.pdf', contentType: 'application/pdf', fileSize: 123, fileHash: HASH,
    tags: ['history'],
  });
}

describe('upload routes', () => {
  it('persists PENDING_UPLOAD before returning a presigned post', async () => {
    const { app, prisma, presignPost, created } = createTestApp();
    const response = await postUpload(app);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'NEW_UPLOAD', documentId: created.documentId,
      uploadUrl: 'http://s3.local/post', url: 'http://s3.local/post',
    });
    expect(prisma.resource.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      ownerId: 1, fileHash: HASH, status: 'PENDING_UPLOAD',
      objectKey: expect.stringMatching(/^1\/[0-9a-f-]+\/file\.pdf$/),
    }) });
    expect(prisma.resource.create.mock.invocationCallOrder[0])
      .toBeLessThan(presignPost.mock.invocationCallOrder[0]);
  });

  it('keeps the persisted pending record when presigning fails', async () => {
    const { app, prisma, presignPost } = createTestApp();
    presignPost.mockRejectedValueOnce(new Error('signing unavailable'));
    const response = await postUpload(app);
    expect(response.status).toBe(500);
    expect(prisma.resource.create).toHaveBeenCalledOnce();
    expect(prisma.resource.updateMany).not.toHaveBeenCalled();
  });

  it('recovers a concurrent deduplication conflict as a resumable upload', async () => {
    const pending = resource();
    const { app, prisma } = createTestApp();
    const conflict = Object.assign(new Error('unique conflict'), { code: 'P2002' });
    prisma.resource.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(pending);
    prisma.resource.create.mockRejectedValueOnce(conflict);
    const response = await postUpload(app);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'RESUME_UPLOAD', documentId: pending.documentId,
    });
  });

  it('resumes a pending upload with the same object key when S3 has no object', async () => {
    const pending = resource();
    const { app, prisma, presignPost } = createTestApp({ existing: pending });
    const response = await postUpload(app);

    expect(response.body).toMatchObject({ status: 'RESUME_UPLOAD', documentId: pending.documentId });
    expect(prisma.resource.create).not.toHaveBeenCalled();
    expect(presignPost).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      Key: pending.objectKey,
    }));
  });

  it('reconciles a pending record when the S3 object already exists', async () => {
    const { app, prisma, textractClient } = createTestApp({
      existing: resource(), headExists: true,
    });
    const response = await postUpload(app);

    expect(response.body).toMatchObject({
      status: 'UPLOAD_ALREADY_COMPLETED',
      document: { id: 11, status: 'PROCESSING' },
    });
    expect(prisma.resource.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: 'PENDING_UPLOAD' }),
    }));
    expect(textractClient.send).toHaveBeenCalledOnce();
  });

  it('returns an existing active material without uploading it again', async () => {
    const { app, presignPost, s3Client } = createTestApp({
      existing: resource({ status: 'PROCESSED', jobId: 'job-1' }),
    });
    const response = await postUpload(app);

    expect(response.body).toMatchObject({
      status: 'ALREADY_EXISTS', document: { id: 11, status: 'PROCESSED' },
    });
    expect(presignPost).not.toHaveBeenCalled();
    expect(s3Client.send).not.toHaveBeenCalled();
  });

  it('does not presign when persistence fails', async () => {
    const { app, prisma, presignPost } = createTestApp();
    prisma.resource.create.mockRejectedValueOnce(new Error('database down'));
    const response = await postUpload(app);
    expect(response.status).toBe(500);
    expect(presignPost).not.toHaveBeenCalled();
  });

  it('validates SHA-256 and file size metadata', async () => {
    const { app, prisma } = createTestApp();
    const response = await request(app).post('/api/upload')
      .set('Cookie', ['session=session-token'])
      .send({ filename: 'x.pdf', contentType: 'application/pdf', fileSize: 0, fileHash: 'bad' });
    expect(response.status).toBe(400);
    expect(prisma.resource.create).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated access', async () => {
    const { app } = createTestApp({ userId: null });
    expect((await request(app).get('/api/upload')).status).toBe(401);
  });

  it('lists only current-user bucket contents using a prefix', async () => {
    const { app, s3Client } = createTestApp();
    const response = await request(app).get('/api/upload')
      .set('Cookie', ['session=session-token']);
    expect(response.body).toEqual([{ Key: '1/file-1' }]);
    expect((s3Client.send.mock.calls[0][0] as ListObjectsCommand).input.Prefix).toBe('1/');
  });
});
