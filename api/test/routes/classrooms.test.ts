import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createClassroomsRouter } from '../../src/routes/classrooms';

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
    user: {
      findUnique: vi.fn().mockResolvedValue({
        ownedClasses: [
          {
            id: 20,
            name: 'Class A',
            code: 'ABC123',
            owner: {
              id: 1,
              name: 'User',
              email: 'user@example.com',
            },
          },
        ],
        classrooms: [],
      }),
    },
    classroom: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({
        id: 30,
        name: 'Class B',
        code: 'ZXCVBN',
        ownerId: 1,
      }),
      update: vi.fn().mockResolvedValue({ id: 20 }),
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
    '/api/classrooms',
    createClassroomsRouter({
      authService: authService as never,
      prisma: prisma as never,
    }),
  );

  return { app, prisma };
}

describe('classrooms routes', () => {
  it('rejects unauthenticated access', async () => {
    const { app } = createTestApp({ userId: null });

    const response = await request(app).get('/api/classrooms');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('lists owner and student classrooms', async () => {
    const { app, prisma } = createTestApp();

    const response = await request(app)
      .get('/api/classrooms')
      .set('Cookie', ['session=session-token']);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      ownedClasses: [
        {
          id: 20,
          name: 'Class A',
          code: 'ABC123',
          owner: {
            id: 1,
            name: 'User',
            email: 'user@example.com',
          },
        },
      ],
      classrooms: [],
    });
    expect(prisma.user.findUnique).toHaveBeenCalledOnce();
  });

  it('creates a classroom with generated code', async () => {
    const { app, prisma } = createTestApp();

    const response = await request(app)
      .post('/api/classrooms')
      .set('Cookie', ['session=session-token'])
      .send({ name: 'Class B' });

    expect(response.status).toBe(200);
    expect(response.body.classroom).toEqual({
      id: 30,
      name: 'Class B',
      code: 'ZXCVBN',
      ownerId: 1,
    });
    expect(prisma.classroom.create).toHaveBeenCalledOnce();
  });

  it('joins a classroom by code', async () => {
    const { app, prisma } = createTestApp();
    prisma.classroom.findFirst.mockResolvedValueOnce({ id: 20, code: 'ABC123' });

    const response = await request(app)
      .post('/api/classrooms/join')
      .set('Cookie', ['session=session-token'])
      .send({ code: 'abc123' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
    expect(prisma.classroom.update).toHaveBeenCalledWith({
      where: { id: 20 },
      data: {
        students: {
          connect: {
            id: 1,
          },
        },
      },
    });
  });

  it('returns not found when joining unknown code', async () => {
    const { app } = createTestApp();

    const response = await request(app)
      .post('/api/classrooms/join')
      .set('Cookie', ['session=session-token'])
      .send({ code: 'UNKNOWN' });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Classroom not found' });
  });
});