import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createResourceRouter } from '../../src/routes/resource';

function createAuthServiceStub(userId: number | null = 1) {
  return {
    getCurrentUser: vi.fn().mockResolvedValue(
      userId
        ? { id: userId, name: 'User', email: 'user@example.com', image: null, googleSub: null }
        : null,
    ),
  };
}

function createPrismaStub() {
  return {
    resource: {
      create: vi.fn().mockResolvedValue({ id: 11 }),
      update: vi.fn().mockResolvedValue({ id: 11 }),
      findMany: vi.fn().mockResolvedValue([{ id: 11 }]),
    },
  };
}

function createTextractStub() {
  return {
    send: vi.fn().mockResolvedValue({ JobId: 'job-123' }),
  };
}

function createTestApp(options?: { userId?: number | null }) {
  const authService = createAuthServiceStub(options?.userId ?? 1);
  const prisma = createPrismaStub();
  const textractClient = createTextractStub();

  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use(
    '/api/resource',
    createResourceRouter({
      authService: authService as never,
      prisma: prisma as never,
      textractClient: textractClient as never,
      bucketName: 'bucket',
      outputBucketName: 'output-bucket',
      snsTopicArn: 'topic-arn',
      snsRoleArn: 'role-arn',
    }),
  );

  return { app, authService, prisma, textractClient };
}

describe('resource routes', () => {
  it('rejects unauthenticated access', async () => {
    const { app } = createTestApp({ userId: null });

    const response = await request(app).get('/api/resource');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('creates a resource and starts textract', async () => {
    const { app, prisma, textractClient } = createTestApp();

    const response = await request(app)
      .post('/api/resource')
      .set('Cookie', ['session=session-token'])
      .send({
        filename: 'file.pdf',
        fileType: 'application/pdf',
        objectKey: 'object-key',
        tags: ['tag-1'],
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ resource: { id: 11 } });
    expect(prisma.resource.create).toHaveBeenCalledOnce();
    expect(prisma.resource.update).toHaveBeenCalledOnce();
    expect(textractClient.send).toHaveBeenCalledOnce();
  });

  it('lists resources for the current user', async () => {
    const { app, prisma } = createTestApp();

    const response = await request(app)
      .get('/api/resource')
      .set('Cookie', ['session=session-token']);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ resources: [{ id: 11 }] });
    expect(prisma.resource.findMany).toHaveBeenCalledOnce();
  });
});
