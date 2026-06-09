import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createQuestionsRouter } from '../../src/routes/questions';

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
  const tx = {
    question: {
      create: vi.fn().mockResolvedValue({ id: 22 }),
      findUnique: vi.fn().mockResolvedValue({ tags: [{ id: 1 }] }),
      update: vi.fn().mockResolvedValue({ id: 10 }),
    },
  };

  return {
    question: {
      findUnique: vi.fn().mockResolvedValue({
        id: 10,
        authorId: 1,
        type: 'multiple_choice',
        level: 1,
        content: { statement: 'Q1' },
        version: 1,
        deletedAt: null,
        tags: [{ id: 1 }],
      }),
      findMany: vi.fn().mockResolvedValue([
        {
          id: 10,
          authorId: 1,
          type: 'multiple_choice',
          level: 1,
          content: { statement: 'Q1' },
          deletedAt: null,
          tags: [{ id: 1 }],
        },
      ]),
      create: vi.fn().mockResolvedValue({ id: 11, type: 'multiple_choice', tags: [] }),
      createMany: vi.fn().mockResolvedValue({ count: 2 }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    $queryRaw: vi.fn().mockResolvedValue([]),
    $transaction: vi.fn().mockImplementation(async (callback: (txArg: typeof tx) => Promise<unknown>) => callback(tx)),
  };
}

function createTestApp(options?: { userId?: number | null }) {
  const authService = createAuthServiceStub(options?.userId ?? 1);
  const prisma = createPrismaStub();

  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use(
    '/api/questions',
    createQuestionsRouter({
      authService: authService as never,
      prisma: prisma as never,
    }),
  );

  return { app, authService, prisma };
}

describe('questions routes', () => {
  it('rejects unauthenticated access', async () => {
    const { app } = createTestApp({ userId: null });

    const response = await request(app).get('/api/questions');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('lists user questions', async () => {
    const { app, prisma } = createTestApp();

    const response = await request(app)
      .get('/api/questions')
      .set('Cookie', ['session=session-token']);

    expect(response.status).toBe(200);
    expect(response.body.questions).toHaveLength(1);
    expect(prisma.question.findMany).toHaveBeenCalledOnce();
  });

  it('gets a question by id using query param', async () => {
    const { app, prisma } = createTestApp();

    const response = await request(app)
      .get('/api/questions?id=10')
      .set('Cookie', ['session=session-token']);

    expect(response.status).toBe(200);
    expect(response.body.question.id).toBe(10);
    expect(prisma.question.findUnique).toHaveBeenCalledOnce();
  });

  it('creates a question', async () => {
    const { app, prisma } = createTestApp();

    const response = await request(app)
      .post('/api/questions')
      .set('Cookie', ['session=session-token'])
      .send({
        type: 'multiple_choice',
        level: 'medium',
        content: { statement: 'Q2' },
        source: 'MANUAL',
        tags: [1],
      });

    expect(response.status).toBe(200);
    expect(response.body.question.id).toBe(11);
    expect(prisma.question.create).toHaveBeenCalledOnce();
  });

  it('creates multiple questions in bulk', async () => {
    const { app, prisma } = createTestApp();

    const response = await request(app)
      .post('/api/questions/bulk')
      .set('Cookie', ['session=session-token'])
      .send({
        questions: [
          { type: 'multiple_choice', level: 1, content: { statement: 'A' } },
          { type: 'multiple_choice', level: 2, content: { statement: 'B' } },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ count: 2 });
    expect(prisma.question.createMany).toHaveBeenCalledOnce();
  });

  it('returns not found when deleting unknown ids', async () => {
    const { app, prisma } = createTestApp();
    prisma.question.updateMany.mockResolvedValueOnce({ count: 0 });

    const response = await request(app)
      .delete('/api/questions')
      .set('Cookie', ['session=session-token'])
      .send({ questionIds: [999] });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'No questions found to delete' });
  });

  it('soft deletes user questions', async () => {
    const { app, prisma } = createTestApp();

    const response = await request(app)
      .delete('/api/questions')
      .set('Cookie', ['session=session-token'])
      .send({ questionIds: [10, 11] });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, count: 1 });
    expect(prisma.question.updateMany).toHaveBeenCalledOnce();
  });

  it('returns no-op when update payload is unchanged', async () => {
    const { app, prisma } = createTestApp();

    const response = await request(app)
      .patch('/api/questions/10')
      .set('Cookie', ['session=session-token'])
      .send({
        type: 'multiple_choice',
        level: 1,
        content: { statement: 'Q1' },
        tags: [1],
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, updated: false });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
