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
  it('uses reranked parents for both generation and references with per-call limits', async () => {
    const sqlClient = vi.fn().mockResolvedValue([
      { content: 'child A', parent_id: 'a', parent_content: 'Parent A', document: 'book.pdf', parent_heading: 'A', parent_pages: [1] },
      { content: 'child B', parent_id: 'b', parent_content: 'Parent B', document: 'book.pdf', parent_heading: 'B', parent_pages: [2] },
    ]);
    const openaiClient = {
      embeddings: { create: vi.fn().mockResolvedValue({ data: [{ embedding: [1] }] }) },
      responses: { create: vi.fn().mockResolvedValue(createStream([])) },
    };
    const rerank = vi.fn().mockResolvedValue([{ index: 1, score: 0.9 }, { index: 0, score: 0.1 }]);
    const socket = { emit: vi.fn() };
    const generator = createQuestionGenerator({ openaiClient: openaiClient as never, sqlClient, reranker: { rerank } });

    await generator.generateQuestion('prompt', 'gpt-4.1', ['book.pdf'], socket, { maxParents: 1 });

    expect(socket.emit).toHaveBeenCalledWith('generation-context', [
      { document: 'book.pdf', title: 'B', pages: [2], content: 'Parent B' },
    ]);
    const context = openaiClient.responses.create.mock.calls[0][0].input[1].content;
    expect(context).toContain('Parent B');
    expect(context).not.toContain('Parent A');
    expect(context).not.toContain('child B');
  });

  it('continues generating with vector context when reranking fails', async () => {
    const openaiClient = {
      embeddings: { create: vi.fn().mockResolvedValue({ data: [{ embedding: [1] }] }) },
      responses: { create: vi.fn().mockResolvedValue(createStream([{ type: 'response.completed' }])) },
    };
    const socket = { emit: vi.fn() };
    const generator = createQuestionGenerator({
      openaiClient: openaiClient as never,
      sqlClient: vi.fn().mockResolvedValue([{ content: 'vector first' }, { content: 'vector second' }]),
      reranker: { rerank: vi.fn().mockRejectedValue(new Error('unavailable')) },
      onRerankFallback: vi.fn(),
    });

    await generator.generateQuestion('prompt', 'gpt-4.1', ['book.pdf'], socket);

    expect(openaiClient.responses.create.mock.calls[0][0].input[1].content).toContain('[Chunk 1] vector first');
    expect(socket.emit).toHaveBeenCalledWith('generation-finished');
  });

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
    expect(socket.emit).toHaveBeenCalledWith('generation-context', [
      { document: 'material', title: null, pages: [], content: 'chunk-a' },
    ]);
    expect(socket.emit.mock.invocationCallOrder[0]).toBeLessThan(
      openaiClient.responses.create.mock.invocationCallOrder[0],
    );
    expect(openaiClient.responses.create).toHaveBeenCalledOnce();
  });

  it('publishes only the parent references included in the model context', async () => {
    const parent = {
      document: 'book.pdf', parent_id: 'section-1', parent_content: 'Full section',
      parent_pages: [2, 3], parent_heading: 'Fotossíntese',
    };
    const sqlClient = vi.fn().mockResolvedValue([
      { ...parent, content: 'child one', pages: [2] },
      { ...parent, content: 'child two', pages: [3] },
      { content: 'Legacy excerpt', document: 'other.pdf', pages: [7] },
      { content: 'Excluded content'.repeat(2000), document: 'other.pdf', pages: [8] },
    ]);
    const socket = { emit: vi.fn() };
    const openaiClient = {
      embeddings: { create: vi.fn().mockResolvedValue({ data: [{ embedding: [1, 2, 3] }] }) },
      responses: { create: vi.fn().mockResolvedValue(createStream([])) },
    };
    const generator = createQuestionGenerator({ openaiClient: openaiClient as never, sqlClient });

    await generator.generateQuestion('prompt', 'gpt-4.1', ['book.pdf', 'other.pdf'], socket);

    expect(socket.emit).toHaveBeenCalledWith('generation-context', [
      { document: 'book.pdf', title: 'Fotossíntese', pages: [2, 3], content: 'Full section' },
      { document: 'other.pdf', title: null, pages: [7], content: 'Legacy excerpt' },
    ]);
    const input = openaiClient.responses.create.mock.calls[0][0].input[1].content;
    expect(input).toContain('[Fonte: book.pdf, página(s) 2, 3, seção: Fotossíntese]\nFull section');
    expect(input).toContain('Legacy excerpt');
    expect(input).not.toContain('child one');
    expect(input).not.toContain('Excluded content');
  });

  it('publishes an empty context when selected documents have no matches', async () => {
    const socket = { emit: vi.fn() };
    const openaiClient = {
      embeddings: { create: vi.fn().mockResolvedValue({ data: [{ embedding: [1] }] }) },
      responses: { create: vi.fn().mockResolvedValue(createStream([])) },
    };
    const generator = createQuestionGenerator({ openaiClient: openaiClient as never, sqlClient: vi.fn().mockResolvedValue([]) });

    await generator.generateQuestion('prompt', 'gpt-4.1', ['book.pdf'], socket);
    expect(socket.emit).toHaveBeenCalledWith('generation-context', []);

    socket.emit.mockClear();
    await generator.generateQuestion('prompt', 'gpt-4.1', [], socket);
    expect(socket.emit).not.toHaveBeenCalled();
    expect(openaiClient.embeddings.create).toHaveBeenCalledOnce();
  });
});
