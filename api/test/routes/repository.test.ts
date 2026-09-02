import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createRepositoryRouter } from '../../src/routes/repository';

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
    repositoryQuestion: {
      create: vi.fn().mockResolvedValue({ id: 10, type: 'multiple_choice' }),
      findUnique: vi.fn().mockResolvedValue({ id: 10, deletedAt: null }),
      findMany: vi.fn().mockResolvedValue([
        {
          id: 10,
          level: 1,
          source: 'ENEM',
          subjects: ['Math'],
          content: { statement: 'Q1' },
          deletedAt: null,
        },
      ]),
    },
    question: {
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
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
    '/api/repository',
    createRepositoryRouter({
      authService: authService as never,
      prisma: prisma as never,
    }),
  );

  return { app, authService, prisma };
}

describe('repository routes', () => {
  it('rejects unauthenticated access', async () => {
    const { app } = createTestApp({ userId: null });

    const response = await request(app).get('/api/repository');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('lists repository questions', async () => {
    const { app, prisma } = createTestApp();

    const response = await request(app)
      .get('/api/repository')
      .set('Cookie', ['session=session-token']);

    expect(response.status).toBe(200);
    expect(response.body.questions).toEqual([
      {
        id: 10,
        level: 1,
        source: 'ENEM',
        subjects: ['Math'],
        content: { statement: 'Q1' },
        deletedAt: null,
      },
    ]);
    expect(prisma.repositoryQuestion.findMany).toHaveBeenCalledOnce();
  });

  it('creates repository question', async () => {
    const { app, prisma } = createTestApp();

    const response = await request(app)
      .post('/api/repository')
      .set('Cookie', ['session=session-token'])
      .send({
        type: 'multiple_choice',
        level: 1,
        content: { statement: 'Q1' },
        subjects: ['Math'],
        tags: ['geometry'],
        source: 'ENEM',
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ question: { id: 10, type: 'multiple_choice' } });
    expect(prisma.repositoryQuestion.create).toHaveBeenCalledOnce();
  });

  it('clones repository questions to personal bank', async () => {
    const { app, prisma } = createTestApp();

    const response = await request(app)
      .post('/api/repository/clone')
      .set('Cookie', ['session=session-token'])
      .send({ questionIds: [10] });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ count: 1 });
    expect(prisma.repositoryQuestion.findMany).toHaveBeenCalledOnce();
    expect(prisma.question.createMany).toHaveBeenCalledOnce();
  });

  it('rejects clone payload when no questionIds', async () => {
    const { app } = createTestApp();

    const response = await request(app)
      .post('/api/repository/clone')
      .set('Cookie', ['session=session-token'])
      .send({ questionIds: [] });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Bad Request' });
  });
});
