import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { assertAvailableDocuments, createApp, handlePromptRequest } from '../src/app';

describe('prompt request handler', () => {
  it('blocks generation when a selected material is deleted or unavailable', async () => {
    const generator = { generateQuestion: vi.fn() };
    const socket = { emit: vi.fn() };
    const prisma = { resource: { count: vi.fn().mockResolvedValue(0) } };
    await handlePromptRequest(generator as never, socket, { documents: ['original-key'] },
      (documents) => assertAvailableDocuments(prisma as never, 1, documents));
    expect(generator.generateQuestion).not.toHaveBeenCalled();
    expect(socket.emit).toHaveBeenCalledWith('generation-error', expect.stringContaining('não está mais disponível'));
    expect(prisma.resource.count).toHaveBeenCalledWith({
      where: { ownerId: 1, objectKey: { in: ['original-key'] }, deletedAt: null, status: 'PROCESSED' },
    });
  });

  it('accepts available documents and handles duplicate selections', async () => {
    const prisma = { resource: { count: vi.fn().mockResolvedValue(1) } };
    await expect(assertAvailableDocuments(prisma as never, 1, ['key', 'key'])).resolves.toBeUndefined();
    expect(prisma.resource.count.mock.calls[0][0].where.objectKey.in).toEqual(['key']);
  });
  it('swallows generator failures and emits a socket error', async () => {
    const generator = {
      generateQuestion: vi.fn().mockRejectedValue(new Error('quota exceeded')),
    };
    const socket = { emit: vi.fn() };

    await expect(
      handlePromptRequest(generator as never, socket as never, {
        prompt: 'teste o4-mini',
        model: 'gpt-4.1',
        documents: ['doc-1'],
      }),
    ).resolves.toBeUndefined();

    expect(generator.generateQuestion).toHaveBeenCalledOnce();
    expect(socket.emit).toHaveBeenCalledWith('generation-error', 'quota exceeded');
  });

  it('tolerates missing payload fields', async () => {
    const generator = {
      generateQuestion: vi.fn().mockResolvedValue(undefined),
    };
    const socket = { emit: vi.fn() };

    await expect(handlePromptRequest(generator as never, socket as never, undefined)).resolves.toBeUndefined();

    expect(generator.generateQuestion).toHaveBeenCalledWith('', '', [], socket);
    expect(socket.emit).not.toHaveBeenCalled();
  });
});

describe('application transport configuration', () => {
  it('allows the Vite development origin by default', async () => {
    const previousFrontendUrl = process.env.FRONTEND_URL;
    delete process.env.FRONTEND_URL;

    try {
      const response = await request(createApp({} as never))
        .get('/')
        .set('Origin', 'http://localhost:5173');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe(
        'http://localhost:5173',
      );
      expect(response.headers['access-control-allow-credentials']).toBe(
        'true',
      );
    } finally {
      if (previousFrontendUrl === undefined) {
        delete process.env.FRONTEND_URL;
      } else {
        process.env.FRONTEND_URL = previousFrontendUrl;
      }
    }
  });
});
