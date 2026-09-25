import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createResourceRouter } from '../../src/routes/resource';

function createTestApp(userId: number | null = 1) {
  const authService = { getCurrentUser: vi.fn().mockResolvedValue(userId ? {
    id: userId, name: 'User', email: 'user@example.com', image: null, googleSub: null,
  } : null) };
  const prisma = { resource: { findMany: vi.fn().mockResolvedValue([{ id: 11 }]) } };
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/api/resource', createResourceRouter({ authService: authService as never, prisma: prisma as never }));
  return { app, prisma };
}

describe('resource routes', () => {
  it('rejects unauthenticated access', async () => {
    expect((await request(createTestApp(null).app).get('/api/resource')).status).toBe(401);
  });

  it('lists resources owned by the current user', async () => {
    const { app, prisma } = createTestApp();
    const response = await request(app).get('/api/resource')
      .set('Cookie', ['session=session-token']);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ resources: [{ id: 11 }] });
    expect(prisma.resource.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ ownerId: 1, deletedAt: null }),
    }));
  });

  it('does not expose the legacy browser-driven create endpoint', async () => {
    const response = await request(createTestApp().app).post('/api/resource')
      .set('Cookie', ['session=session-token']).send({});
    expect(response.status).toBe(404);
  });
});
