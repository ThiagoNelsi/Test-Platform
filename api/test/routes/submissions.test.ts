import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createSubmissionsRouter } from '../../src/routes/submissions';

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
    submission: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({
        id: 50,
        answers: {},
        finishTime: null,
        score: null,
        startTime: new Date('2026-06-09T00:00:00.000Z'),
        sections: [
          {
            questions: [
              {
                content: {
                  statement: 'Q1',
                  answer: 'A',
                },
              },
            ],
          },
        ],
      }),
      update: vi.fn().mockResolvedValue({ id: 50 }),
    },
    test: {
      findFirst: vi.fn().mockResolvedValue({
        id: 10,
        name: 'Test A',
        description: null,
        value: 10,
        dueDate: null,
        timer: null,
        status: 'published',
        deletedAt: null,
        sections: [
          {
            shuffle: true,
            questions: [{ questionId: 1, version: 3 }],
          },
        ],
        classroom: {
          name: 'Class A',
          students: [{ id: 1 }],
        },
      }),
    },
    question: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: 1,
          originalQuestionId: null,
          content: { statement: 'Q1', answer: 'A' },
          type: 'multiple_choice',
          version: 3,
        },
      ]),
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
    '/api/submissions',
    createSubmissionsRouter({
      authService: authService as never,
      prisma: prisma as never,
    }),
  );

  return { app, prisma };
}

describe('submissions routes', () => {
  it('rejects unauthenticated access', async () => {
    const { app } = createTestApp({ userId: null });

    const response = await request(app).post('/api/submissions').send({ testId: 10 });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('creates a submission and strips answers from response sections', async () => {
    const { app, prisma } = createTestApp();

    const response = await request(app)
      .post('/api/submissions')
      .set('Cookie', ['session=session-token'])
      .send({ testId: 10 });

    expect(response.status).toBe(200);
    expect(response.body.submission.id).toBe(50);
    expect(response.body.submission.sections[0].questions[0].content.answer).toBeUndefined();
    expect(prisma.submission.create).toHaveBeenCalledOnce();
  });

  it('returns existing submission without creating a new one', async () => {
    const { app, prisma } = createTestApp();
    prisma.submission.findFirst.mockResolvedValueOnce({
      id: 51,
      answers: {},
      finishTime: null,
      score: null,
      startTime: new Date('2026-06-09T00:00:00.000Z'),
      sections: [
        {
          questions: [
            {
              content: {
                statement: 'Q1',
                answer: 'A',
              },
            },
          ],
        },
      ],
    });

    const response = await request(app)
      .post('/api/submissions')
      .set('Cookie', ['session=session-token'])
      .send({ testId: 10 });

    expect(response.status).toBe(200);
    expect(response.body.submission.id).toBe(51);
    expect(prisma.submission.create).not.toHaveBeenCalled();
    expect(response.body.submission.sections[0].questions[0].content.answer).toBeUndefined();
  });

  it('saves submission answers', async () => {
    const { app, prisma } = createTestApp();
    prisma.submission.findFirst.mockResolvedValueOnce({ id: 50, userId: 1, finishTime: null });

    const response = await request(app)
      .patch('/api/submissions/50/save')
      .set('Cookie', ['session=session-token'])
      .send({ answers: { '1': 'B' } });

    expect(response.status).toBe(200);
    expect(response.body.submission.id).toBe(50);
    expect(prisma.submission.update).toHaveBeenCalledOnce();
  });

  it('finishes submission with final answers', async () => {
    const { app, prisma } = createTestApp();
    prisma.submission.findFirst.mockResolvedValueOnce({ id: 50, userId: 1, finishTime: null });

    const response = await request(app)
      .patch('/api/submissions/50/finish')
      .set('Cookie', ['session=session-token'])
      .send({ answers: { '1': 'C' } });

    expect(response.status).toBe(200);
    expect(response.body.submission.id).toBe(50);
    expect(prisma.submission.update).toHaveBeenCalledOnce();
  });

  it('returns forbidden when user is not in classroom', async () => {
    const { app, prisma } = createTestApp();
    prisma.test.findFirst.mockResolvedValueOnce({
      id: 10,
      name: 'Test A',
      description: null,
      value: 10,
      dueDate: null,
      timer: null,
      status: 'published',
      deletedAt: null,
      sections: [],
      classroom: {
        name: 'Class A',
        students: [{ id: 2 }],
      },
    });

    const response = await request(app)
      .post('/api/submissions')
      .set('Cookie', ['session=session-token'])
      .send({ testId: 10 });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'Forbidden' });
  });
});
