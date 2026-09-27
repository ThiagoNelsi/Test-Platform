import { describe, expect, it, vi } from 'vitest';
import { createQuestionGenerator } from '../../src/questions/generator';

function createStream(chunks: Array<Record<string, unknown>>) {
  return (async function* () {
    for (const chunk of chunks) {
      yield chunk;
    }
  })();
}

describe('question generator', () => {
  it('retrieves chunks from embeddings and SQL', async () => {
    const sqlClient = vi.fn().mockResolvedValue([
      { content: 'chunk-a' },
      { content: 'chunk-b' },
    ]);

    const openaiClient = {
      embeddings: {
        create: vi.fn().mockResolvedValue({ data: [{ embedding: [1, 2, 3] }] }),
      },
      responses: {
        create: vi.fn(),
      },
    };

    const generator = createQuestionGenerator({
      openaiClient: openaiClient as never,
      sqlClient: sqlClient as never,
      promptTemplate: 'template',
    });

    await expect(generator.getChunks(['doc-1'], 'prompt')).resolves.toEqual(['chunk-a', 'chunk-b']);
    expect(openaiClient.embeddings.create).toHaveBeenCalledOnce();
    expect(sqlClient).toHaveBeenCalledOnce();
  });

  it('expands a matching child to its parent once with a source reference', async () => {
    const sqlClient = vi.fn().mockResolvedValue([
      {
        content: 'child one', document: 'book.pdf', pages: [2], parent_id: 'section-1',
        parent_content: 'Full section', parent_pages: [2, 3], parent_heading: 'Fotossíntese',
      },
      {
        content: 'child two', document: 'book.pdf', pages: [3], parent_id: 'section-1',
        parent_content: 'Full section', parent_pages: [2, 3], parent_heading: 'Fotossíntese',
      },
    ]);
    const openaiClient = {
      embeddings: { create: vi.fn().mockResolvedValue({ data: [{ embedding: [1, 2, 3] }] }) },
      responses: { create: vi.fn() },
    };
    const generator = createQuestionGenerator({ openaiClient: openaiClient as never, sqlClient: sqlClient as never });

    await expect(generator.getChunks(['book.pdf'], 'prompt')).resolves.toEqual([
      '[Fonte: book.pdf, página(s) 2, 3, seção: Fotossíntese]\nFull section',
    ]);
  });

  it('streams generated chunks to the socket', async () => {
    const sqlClient = vi.fn().mockResolvedValue([{ content: 'chunk-a' }]);

    const openaiClient = {
      embeddings: {
        create: vi.fn().mockResolvedValue({ data: [{ embedding: [1, 2, 3] }] }),
      },
      responses: {
        create: vi.fn().mockResolvedValue(
          createStream([
            { type: 'response.reasoning_summary_part.added' },
            { type: 'response.output_text.delta', delta: 'hello' },
            { type: 'response.completed' },
          ]),
        ),
      },
    };

    const socket = { emit: vi.fn() };
    const generator = createQuestionGenerator({
      openaiClient: openaiClient as never,
      sqlClient: sqlClient as never,
      promptTemplate: 'template',
    });

    await generator.generateQuestion('prompt', 'gpt-4.1', ['doc-1'], socket as never);

    expect(socket.emit).toHaveBeenCalledWith('reasoning-started');
    expect(socket.emit).toHaveBeenCalledWith('chunk', 'hello');
    expect(socket.emit).toHaveBeenCalledWith('generation-finished');
    expect(openaiClient.responses.create).toHaveBeenCalledOnce();
  });
});
