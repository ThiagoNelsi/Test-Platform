import { describe, expect, it, vi } from 'vitest';
import { handlePromptRequest } from '../src/app';

describe('prompt request handler', () => {
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
