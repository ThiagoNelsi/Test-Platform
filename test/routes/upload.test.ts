import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createUploadRouter } from '../../src/routes/upload';

function createTestApp(options: { presignResult?: { url: string; fields: Record<string, string> } }) {
  const presignPost = vi.fn().mockResolvedValue(
    options.presignResult ?? { url: 'http://s3.local/post', fields: { key: 'value' } },
  );
  const s3Client = {
    send: vi.fn().mockResolvedValue({ Contents: [{ Key: 'file-1' }] }),
  };

  const app = express();
  app.use(express.json());
  app.use(
    '/api/upload',
    createUploadRouter({
      bucketName: 'bucket-name',
      region: 'us-east-1',
      s3Client: s3Client as never,
      presignPost,
    }),
  );

  return { app, presignPost, s3Client };
}

describe('upload routes', () => {
  it('returns a presigned post', async () => {
    const { app, presignPost } = createTestApp({});

    const response = await request(app)
      .post('/api/upload')
      .send({ contentType: 'image/png' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      url: 'http://s3.local/post',
      fields: { key: 'value' },
    });
    expect(presignPost).toHaveBeenCalledOnce();
  });

  it('rejects requests missing contentType', async () => {
    const { app, presignPost } = createTestApp({});

    const response = await request(app).post('/api/upload').send({});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Missing contentType' });
    expect(presignPost).not.toHaveBeenCalled();
  });

  it('lists bucket contents', async () => {
    const { app, s3Client } = createTestApp({});

    const response = await request(app).get('/api/upload');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ Key: 'file-1' }]);
    expect(s3Client.send).toHaveBeenCalledOnce();
  });

  it('handles S3 list errors', async () => {
    const { app, s3Client } = createTestApp({});
    s3Client.send.mockRejectedValueOnce(new Error('s3 down'));

    const response = await request(app).get('/api/upload');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 's3 down' });
  });
});
