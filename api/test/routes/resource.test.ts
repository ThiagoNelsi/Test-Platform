import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { S3Client } from '@aws-sdk/client-s3';
import { createResourceRouter } from '../../src/routes/resource';

function createTestApp(userId: number | null = 1) {
  const authService = { getCurrentUser: vi.fn().mockResolvedValue(userId ? {
    id: userId, name: 'User', email: 'user@example.com', image: null, googleSub: null,
  } : null) };
  const material = {
    id: 11, ownerId: 1, documentId: 'document-1', filename: 'Filosofia.pdf', tags: ['Filosofia'],
    objectKey: '1/document-1/original.pdf', status: 'PROCESSED', fileType: 'application/pdf', deletedAt: null as Date | null,
  };
  const matches = (where: Record<string, any>) => material.id === (where.id ?? material.id) &&
    material.ownerId === where.ownerId && (where.deletedAt === null ? material.deletedAt === null : material.deletedAt !== null);
  const prisma = { resource: {
    findMany: vi.fn().mockImplementation(async ({ where }) => matches(where) ? [{ ...material }] : []),
    findFirst: vi.fn().mockImplementation(async ({ where }) => matches(where) ? { ...material } : null),
    updateMany: vi.fn().mockImplementation(async ({ where, data }) => {
      if (!matches(where)) return { count: 0 };
      Object.assign(material, data);
      return { count: 1 };
    }),
  } };
  const presignFile = vi.fn().mockResolvedValue('https://files.example.test/signed');
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/api/resource', createResourceRouter({
    authService: authService as never, prisma: prisma as never,
    bucketName: 'materials', s3Client: new S3Client({ region: 'us-east-1' }), presignFile,
  }));
  return { app, prisma, material, presignFile };
}

const session = ['session=session-token'];

describe('resource routes', () => {
  it('rejects unauthenticated access to every operation', async () => {
    const { app } = createTestApp(null);
    for (const response of await Promise.all([
      request(app).get('/api/resource').set('Cookie', session),
      request(app).patch('/api/resource/11').set('Cookie', session).send({ filename: 'New.pdf', tags: [] }),
      request(app).delete('/api/resource/11').set('Cookie', session),
      request(app).post('/api/resource/11/restore').set('Cookie', session),
      request(app).get('/api/resource/11/file').set('Cookie', session),
      request(app).get('/api/resource'),
    ])) expect(response.status).toBe(401);
  });

  it('lists resources owned by the current user', async () => {
    const { app, prisma } = createTestApp();
    const response = await request(app).get('/api/resource').set('Cookie', session);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ resources: [{ id: 11 }] });
    expect(prisma.resource.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ ownerId: 1, deletedAt: null }),
    }));
  });

  it('renames and edits tags without changing the storage identity', async () => {
    const { app, material, prisma } = createTestApp();
    const response = await request(app).patch('/api/resource/11').set('Cookie', session)
      .send({ filename: '  Filosofia política.pdf  ', tags: [' Hobbes ', 'Hobbes', 'Locke'] });
    expect(response.status).toBe(200);
    expect(response.body.resource).toMatchObject({ filename: 'Filosofia política.pdf', tags: ['Hobbes', 'Locke'] });
    expect(material.objectKey).toBe('1/document-1/original.pdf');
    expect(material.documentId).toBe('document-1');
    expect(prisma.resource.updateMany).toHaveBeenCalledWith({
      where: { id: 11, ownerId: 1, deletedAt: null },
      data: { filename: 'Filosofia política.pdf', tags: ['Hobbes', 'Locke'] },
    });
  });

  it('moves a material to trash, blocks file/edit access, then restores it', async () => {
    const { app, material, presignFile } = createTestApp();
    expect((await request(app).delete('/api/resource/11').set('Cookie', session)).status).toBe(200);
    expect(material.deletedAt).toBeInstanceOf(Date);
    expect((await request(app).get('/api/resource').set('Cookie', session)).body.resources).toEqual([]);
    expect((await request(app).get('/api/resource?deleted=true').set('Cookie', session)).body.resources).toHaveLength(1);
    expect((await request(app).get('/api/resource/11/file').set('Cookie', session)).status).toBe(404);
    expect((await request(app).patch('/api/resource/11').set('Cookie', session).send({ filename: 'New.pdf', tags: [] })).status).toBe(404);
    expect(presignFile).not.toHaveBeenCalled();
    expect((await request(app).post('/api/resource/11/restore').set('Cookie', session)).status).toBe(200);
    expect(material.deletedAt).toBeNull();
    expect((await request(app).get('/api/resource').set('Cookie', session)).body.resources).toHaveLength(1);
    expect(material.status).toBe('PROCESSED');
  });

  it('does not allow another user to edit, delete, restore or access files', async () => {
    const { app, material, presignFile } = createTestApp(2);
    for (const response of await Promise.all([
      request(app).patch('/api/resource/11').set('Cookie', session).send({ filename: 'New.pdf', tags: [] }),
      request(app).delete('/api/resource/11').set('Cookie', session),
      request(app).post('/api/resource/11/restore').set('Cookie', session),
      request(app).get('/api/resource/11/file').set('Cookie', session),
    ])) expect(response.status).toBe(404);
    expect(presignFile).not.toHaveBeenCalled();
    expect(material.filename).toBe('Filosofia.pdf');
    expect(material.deletedAt).toBeNull();
  });

  it.each([
    { filename: '', tags: [] }, { filename: '../file.pdf', tags: [] },
    { filename: 'x'.repeat(256), tags: [] }, { filename: 'New.pdf', tags: [123] },
    { filename: 'New.pdf', tags: [''] }, { filename: 'New.pdf', tags: ['x'.repeat(51)] },
    { filename: 'New.pdf', tags: Array(31).fill('tag') },
  ])('rejects invalid metadata %j', async (body) => {
    const { app, prisma } = createTestApp();
    expect((await request(app).patch('/api/resource/11').set('Cookie', session).send(body)).status).toBe(400);
    expect(prisma.resource.updateMany).not.toHaveBeenCalled();
  });

  it('signs the original object using the new display name for downloads', async () => {
    const { app, material, presignFile } = createTestApp();
    material.filename = 'Política.pdf';
    const response = await request(app).get('/api/resource/11/file?download=true').set('Cookie', session);
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body.url).toBe('https://files.example.test/signed');
    const [, command, settings] = presignFile.mock.calls[0];
    expect(command.input).toMatchObject({ Bucket: 'materials', Key: '1/document-1/original.pdf', ResponseContentType: 'application/octet-stream' });
    expect(command.input.ResponseContentDisposition).toContain("attachment; filename=\"Pol_tica.pdf\"; filename*=UTF-8''Pol%C3%ADtica.pdf");
    expect(settings).toEqual({ expiresIn: 300 });
  });

  it('opens PDFs inline and forces active content to download', async () => {
    const { app, material, presignFile } = createTestApp();
    await request(app).get('/api/resource/11/file').set('Cookie', session);
    expect(presignFile.mock.calls[0][1].input.ResponseContentDisposition).toMatch(/^inline/);
    material.fileType = 'text/html';
    await request(app).get('/api/resource/11/file').set('Cookie', session);
    expect(presignFile.mock.calls[1][1].input.ResponseContentDisposition).toMatch(/^attachment/);
  });

  it.each(['PENDING_UPLOAD', 'EXPIRED'])('does not sign an unavailable %s file', async (status) => {
    const { app, material, presignFile } = createTestApp();
    material.status = status;
    expect((await request(app).get('/api/resource/11/file').set('Cookie', session)).status).toBe(400);
    expect(presignFile).not.toHaveBeenCalled();
  });

  it('allows downloading originals even when processing failed', async () => {
    const { app, material } = createTestApp();
    material.status = 'FAILED';
    expect((await request(app).get('/api/resource/11/file').set('Cookie', session)).status).toBe(200);
  });

  it('rejects invalid IDs and filters', async () => {
    const { app } = createTestApp();
    for (const path of ['/api/resource/0/file', '/api/resource/abc/file', '/api/resource?status=oops', '/api/resource?deleted=oops', '/api/resource/11/file?download=oops']) {
      expect((await request(app).get(path).set('Cookie', session)).status).toBe(400);
    }
  });

  it('does not expose the legacy browser-driven create endpoint', async () => {
    expect((await request(createTestApp().app).post('/api/resource').set('Cookie', session).send({})).status).toBe(404);
  });
});
