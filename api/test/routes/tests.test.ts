import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createTestsRouter } from '../../src/routes/tests';

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
    test: {
      update: vi.fn().mockResolvedValue({ id: 10, status: 'published' }),
      create: vi.fn().mockResolvedValue({ id: 11, status: 'published' }),
    },
  };

  return {
    question: {
      findMany: vi.fn().mockResolvedValue([{ id: 1, version: 3 }]),
    },
    classroom: {
      findMany: vi.fn().mockResolvedValue([{ id: 101 }, { id: 102 }]),
    },
    test: {
      findMany: vi.fn().mockResolvedValue([{ id: 10, name: 'Test A' }]),
      findFirst: vi.fn().mockResolvedValue({
        id: 10,
        authorId: 1,
        name: 'Test A',
        value: 10,
        dueDate: null,
        timer: null,
        description: null,
        publishDate: null,
        status: 'draft',
        sections: [{ questions: [{ questionId: 1, version: 3 }] }],
      }),
      create: vi.fn().mockResolvedValue({ id: 10, name: 'Test A' }),
      update: vi.fn().mockResolvedValue({ id: 10, status: 'scheduled' }),
      delete: vi.fn().mockResolvedValue({ id: 10 }),
    },
    $transaction: vi
      .fn()
      .mockImplementation(async (callback: (txArg: typeof tx) => Promise<unknown>) => callback(tx)),
  };
}

function createTestApp(options?: { userId?: number | null }) {
  const authService = createAuthServiceStub(options?.userId ?? 1);
  const prisma = createPrismaStub();

  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use(
    '/api/tests',
    createTestsRouter({
      authService: authService as never,
      prisma: prisma as never,
    }),
  );

  return { app, authService, prisma };
}

describe('tests routes', () => {
  it('rejects unauthenticated access', async () => {
    const { app } = createTestApp({ userId: null });

    const response = await request(app).get('/api/tests');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('lists owned tests', async () => {
    const { app, prisma } = createTestApp();

    const response = await request(app)
      .get('/api/tests')
      .set('Cookie', ['session=session-token']);

    expect(response.status).toBe(200);
    expect(response.body.tests).toEqual([{ id: 10, name: 'Test A' }]);
    expect(prisma.test.findMany).toHaveBeenCalledOnce();
  });

  it('creates a draft test', async () => {
    const { app, prisma } = createTestApp();

    const response = await request(app)
      .post('/api/tests')
      .set('Cookie', ['session=session-token'])
      .send({
        status: 'draft',
        sections: [{ selectionMode: 'manual', questions: [{ id: 1 }] }],
      });

    expect(response.status).toBe(200);
    expect(response.body.test.id).toBe(10);
    expect(prisma.test.create).toHaveBeenCalledOnce();
  });

  it('updates a test', async () => {
    const { app, prisma } = createTestApp();

    const response = await request(app)
      .patch('/api/tests/10')
      .set('Cookie', ['session=session-token'])
      .send({
        status: 'published',
        publishDate: '2026-06-10T00:00:00.000Z',
        sections: [{ selectionMode: 'manual', questions: [{ id: 1 }] }],
      });

    expect(response.status).toBe(200);
    expect(response.body.test.id).toBe(10);
    expect(prisma.test.update).toHaveBeenCalledOnce();
  });

  it('publishes test with classroom fan-out', async () => {
    const { app, prisma } = createTestApp();

    const response = await request(app)
      .post('/api/tests/10/publish')
      .set('Cookie', ['session=session-token'])
      .send({ classroomIds: [101, 102] });

    expect(response.status).toBe(200);
    expect(response.body.tests).toHaveLength(2);
    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });

  it('schedules test with classroom fan-out', async () => {
    const { app, prisma } = createTestApp();

    const response = await request(app)
      .post('/api/tests/10/schedule')
      .set('Cookie', ['session=session-token'])
      .send({ classroomIds: [101, 102] });

    expect(response.status).toBe(200);
    expect(response.body.tests).toHaveLength(2);
    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });

  it('rejects schedule when classroomIds missing', async () => {
    const { app } = createTestApp();

    const response = await request(app)
      .post('/api/tests/10/schedule')
      .set('Cookie', ['session=session-token'])
      .send({ classroomIds: [] });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Missing classroomIds' });
  });

  it('soft deletes a test by default', async () => {
    const { app, prisma } = createTestApp();

    const response = await request(app)
      .delete('/api/tests/10')
      .set('Cookie', ['session=session-token']);

    expect(response.status).toBe(200);
    expect(response.body.deleted).toBe('soft');
    expect(prisma.test.update).toHaveBeenCalled();
  });
});
