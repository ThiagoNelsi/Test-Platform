import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createTagsRouter } from '../../src/routes/tags';

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
    tag: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: 1,
          name: 'Geometry',
          color: 123,
          userId: 1,
        },
      ]),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({
        id: 2,
        name: 'Algebra',
        color: 456,
        userId: 1,
      }),
    },
  };
}

function createTestApp(options?: { userId?: number | null }) {
  const authService = createAuthServiceStub(options?.userId ?? 1);
  const prisma = createPrismaStub();

  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use(
    '/api/tags',
    createTagsRouter({
      authService: authService as never,
      prisma: prisma as never,
    }),
  );

  return { app, prisma };
}

describe('tags routes', () => {
  it('rejects unauthenticated access', async () => {
    const { app } = createTestApp({ userId: null });

    const response = await request(app).get('/api/tags');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('lists tags for current user', async () => {
    const { app, prisma } = createTestApp();

    const response = await request(app)
      .get('/api/tags')
      .set('Cookie', ['session=session-token']);

    expect(response.status).toBe(200);
    expect(response.body.tags).toEqual([
      {
        id: 1,
        name: 'Geometry',
        color: 123,
        userId: 1,
      },
    ]);
    expect(prisma.tag.findMany).toHaveBeenCalledOnce();
  });

  it('creates a tag', async () => {
    const { app, prisma } = createTestApp();

    const response = await request(app)
      .post('/api/tags')
      .set('Cookie', ['session=session-token'])
      .send({ name: 'Algebra', color: 456 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      tag: {
        id: 2,
        name: 'Algebra',
        color: 456,
        userId: 1,
      },
    });
    expect(prisma.tag.create).toHaveBeenCalledOnce();
  });

  it('rejects duplicate tags', async () => {
    const { app, prisma } = createTestApp();
    prisma.tag.findFirst.mockResolvedValueOnce({ id: 99, userId: 1, name: 'Geometry', color: 123 });

    const response = await request(app)
      .post('/api/tags')
      .set('Cookie', ['session=session-token'])
      .send({ name: 'Geometry', color: 123 });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Tag já existe' });
    expect(prisma.tag.create).not.toHaveBeenCalled();
  });

  it('returns questions grouped by tag', async () => {
    const { app, prisma } = createTestApp();
    prisma.tag.findMany.mockResolvedValueOnce([
      {
        id: 1,
        questions: [{ id: 10 }, { id: 11 }],
      },
    ]);

    const response = await request(app)
      .get('/api/tags/questions-per-tag')
      .set('Cookie', ['session=session-token']);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      questionsPerTag: [{ tagId: 1, questions: [10, 11] }],
    });
    expect(prisma.tag.findMany).toHaveBeenCalled();
  });
});