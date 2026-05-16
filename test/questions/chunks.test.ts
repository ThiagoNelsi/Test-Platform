import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildQuestionMessages,
  emitGenerationChunk,
  formatChunkContext,
  shouldUseLowReasoning,
} from '../../src/questions/chunks';

describe('question chunk helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('formats chunk context', () => {
    expect(formatChunkContext(['alpha', 'beta'])).toBe('[Chunk 1] alpha\n[Chunk 2] beta\n');
  });

  it('builds question messages', () => {
    expect(buildQuestionMessages('prompt', '[Chunk 1] alpha\n', 'template')).toEqual([
      { role: 'developer', content: 'template' },
      {
        role: 'user',
        content: '[Chunks do material]\n[Chunk 1] alpha\n\n\n[Prompt do professor]\nprompt',
      },
    ]);
  });

  it('detects low reasoning models', () => {
    expect(shouldUseLowReasoning('gpt-4.1')).toBe(false);
    expect(shouldUseLowReasoning('claude-3.5')).toBe(true);
  });

  it('emits stream chunks to the socket', () => {
    const socket = { emit: vi.fn() };
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true as never);

    emitGenerationChunk(socket, { type: 'response.output_text.delta', delta: 'hello' });
    emitGenerationChunk(socket, { type: 'response.completed' });

    expect(socket.emit).toHaveBeenCalledWith('chunk', 'hello');
    expect(socket.emit).toHaveBeenCalledWith('generation-finished');
    expect(stdoutSpy).toHaveBeenCalled();
  });
});
