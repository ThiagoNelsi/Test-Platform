import { afterEach, describe, expect, it, vi } from 'vitest';
import { createContextRetriever, resolveRetrievalOptions } from '../../src/questions/retrieval';

function setup(chunks = [
  { content: 'child A', document: 'book.pdf', pages: [1], parent_id: 'a', parent_content: 'Parent A', parent_pages: [1, 2], parent_heading: 'Seção A' },
  { content: 'child B', document: 'book.pdf', pages: [3], parent_id: 'b', parent_content: 'Parent B', parent_pages: [3], parent_heading: 'Seção B' },
  { content: 'another child B', document: 'book.pdf', pages: [3], parent_id: 'b', parent_content: 'Parent B', parent_pages: [3], parent_heading: 'Seção B' },
]) {
  const sqlClient = vi.fn().mockResolvedValue(chunks);
  const openaiClient = {
    embeddings: { create: vi.fn().mockResolvedValue({ data: [{ embedding: [1, 2] }] }) },
  };
  const rerank = vi.fn().mockResolvedValue([
    { index: 0, score: 0.1 }, { index: 1, score: 0.8 }, { index: 2, score: 0.9 },
  ]);
  const onRerankFallback = vi.fn();
  const deps = { sqlClient, openaiClient: openaiClient as never, reranker: { rerank }, onRerankFallback };
  return { ...deps, openaiClient, rerank, retrieve: createContextRetriever(deps) };
}

afterEach(() => vi.useRealTimers());

describe('context retrieval with a provider-independent reranker', () => {
  it('reranks title and child text before expanding and deduplicating parents', async () => {
    const { retrieve, rerank, onRerankFallback } = setup();
    const result = await retrieve(['book.pdf'], 'pergunta do professor');
    expect(rerank).toHaveBeenCalledWith({
      query: 'pergunta do professor',
      documents: ['Seção A\n\nchild A', 'Seção B\n\nchild B', 'Seção B\n\nanother child B'],
      signal: expect.any(AbortSignal),
    });
    expect(result.references.map((reference) => reference.content)).toEqual(['Parent B', 'Parent A']);
    expect(result.context).toEqual([
      '[Fonte: book.pdf, página(s) 3, seção: Seção B]\nParent B',
      '[Fonte: book.pdf, página(s) 1, 2, seção: Seção A]\nParent A',
    ]);
    expect(onRerankFallback).not.toHaveBeenCalled();
  });

  it('accepts limits per call without changing subsequent calls', async () => {
    const { retrieve, sqlClient } = setup();
    const limited = await retrieve(['book.pdf'], 'prompt', { candidateLimit: 20, maxParents: 1 });
    expect(limited.references.map((reference) => reference.content)).toEqual(['Parent B']);
    expect(sqlClient.mock.calls[0].slice(1)).toContain(20);
    const normal = await retrieve(['book.pdf'], 'prompt');
    expect(sqlClient.mock.calls[1].slice(1)).toContain(40);
    expect(normal.references).toHaveLength(2);
  });

  it('keeps all candidates for parent deduplication rather than requesting only five children', async () => {
    const state = setup();
    state.sqlClient.mockResolvedValue(Array.from({ length: 40 }, (_, index) => ({
      content: `child ${index}`, parent_id: index < 39 ? 'a' : 'b',
      parent_content: index < 39 ? 'Parent A' : 'Parent B', document: 'book.pdf',
    })));
    state.rerank.mockResolvedValue(Array.from({ length: 40 }, (_, index) => ({ index, score: 40 - index })));
    expect((await state.retrieve(['book.pdf'], 'prompt')).references.map((r) => r.content))
      .toEqual(['Parent A', 'Parent B']);
    expect(state.rerank.mock.calls[0][0].documents).toHaveLength(40);
  });

  it('supports legacy chunks and uses vector order for score ties', async () => {
    const state = setup();
    state.sqlClient.mockResolvedValue([{ content: 'legacy A' }, { content: 'legacy B' }]);
    state.rerank.mockResolvedValue([{ index: 1, score: 0.5 }, { index: 0, score: 0.5 }]);
    expect((await state.retrieve(['book.pdf'], 'prompt')).context).toEqual(['legacy A', 'legacy B']);
    expect(state.rerank.mock.calls[0][0].documents).toEqual(['legacy A', 'legacy B']);
  });

  it('does not discard candidates by an absolute score threshold', async () => {
    const state = setup();
    state.rerank.mockResolvedValue([{ index: 0, score: 0 }, { index: 1, score: 0.001 }, { index: 2, score: 0.002 }]);
    expect((await state.retrieve(['book.pdf'], 'prompt')).references).toHaveLength(2);
  });

  it('preserves vector order and logs a provider error', async () => {
    const state = setup();
    const error = new Error('AccessDeniedException');
    state.rerank.mockRejectedValue(error);
    const result = await state.retrieve(['book.pdf'], 'prompt');
    expect(result.references.map((reference) => reference.content)).toEqual(['Parent A', 'Parent B']);
    expect(state.onRerankFallback).toHaveBeenCalledWith(error);
  });

  it('enforces timeout, aborts the provider, and handles a late rejection', async () => {
    vi.useFakeTimers();
    const state = setup();
    let rejectProvider!: (error: Error) => void;
    state.rerank.mockImplementation(() => new Promise((_resolve, reject) => { rejectProvider = reject; }));
    const result = state.retrieve(['book.pdf'], 'prompt', { rerankTimeoutMs: 100 });
    await vi.advanceTimersByTimeAsync(99);
    expect(state.onRerankFallback).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect((await result).references.map((reference) => reference.content)).toEqual(['Parent A', 'Parent B']);
    expect(state.rerank.mock.calls[0][0].signal.aborted).toBe(true);
    expect(state.onRerankFallback).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('100ms') }));
    rejectProvider(new Error('late failure'));
    await vi.advanceTimersByTimeAsync(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([
    [],
    [{ index: 0, score: 1 }],
    [{ index: 0, score: 1 }, { index: 0, score: 2 }, { index: 2, score: 3 }],
    [{ index: 0, score: 1 }, { index: 1, score: NaN }, { index: 2, score: 3 }],
    [{ index: -1, score: 1 }, { index: 1, score: 2 }, { index: 2, score: 3 }],
    [{ index: 3, score: 1 }, { index: 1, score: 2 }, { index: 2, score: 3 }],
    [{ index: 0.5, score: 1 }, { index: 1, score: 2 }, { index: 2, score: 3 }],
  ].map((ranking) => ({ ranking })))('falls back for a malformed or incomplete ranking %#', async ({ ranking }) => {
    const state = setup();
    state.rerank.mockResolvedValue(ranking);
    expect((await state.retrieve(['book.pdf'], 'prompt')).references.map((r) => r.content)).toEqual(['Parent A', 'Parent B']);
    expect(state.onRerankFallback).toHaveBeenCalledOnce();
  });

  it('continues even if the fallback observer throws', async () => {
    const state = setup();
    state.rerank.mockRejectedValue(new Error('failed'));
    state.onRerankFallback.mockImplementation(() => { throw new Error('logger failed'); });
    await expect(state.retrieve(['book.pdf'], 'prompt')).resolves.toHaveProperty('context');
  });

  it('clears the timeout after successful reranking', async () => {
    vi.useFakeTimers();
    const state = setup();
    await state.retrieve(['book.pdf'], 'prompt');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('skips reranking for zero or one candidate', async () => {
    const state = setup();
    state.sqlClient.mockResolvedValueOnce([]).mockResolvedValueOnce([{ content: 'only' }]);
    expect((await state.retrieve(['book.pdf'], 'prompt')).context).toEqual([]);
    expect((await state.retrieve(['book.pdf'], 'prompt')).context).toEqual(['only']);
    expect(state.rerank).not.toHaveBeenCalled();
  });

  it('does not call external services when no documents were selected', async () => {
    const state = setup();
    expect(await state.retrieve([], 'prompt')).toEqual({ context: [], references: [] });
    expect(state.sqlClient).not.toHaveBeenCalled();
    expect(state.openaiClient.embeddings.create).not.toHaveBeenCalled();
    expect(state.rerank).not.toHaveBeenCalled();
  });

  it('works without any reranker configured', async () => {
    const state = setup();
    const retrieve = createContextRetriever({ ...state, openaiClient: state.openaiClient as never, reranker: undefined });
    expect((await retrieve(['book.pdf'], 'prompt')).references.map((r) => r.content)).toEqual(['Parent A', 'Parent B']);
  });

  it('enforces the character budget even for the first match and allows smaller later matches', async () => {
    const state = setup();
    state.sqlClient.mockResolvedValue([{ content: 'too big'.repeat(100) }, { content: 'fits' }, { content: 'also fits' }]);
    state.rerank.mockResolvedValue([{ index: 0, score: 3 }, { index: 1, score: 2 }, { index: 2, score: 1 }]);
    const result = await state.retrieve(['book.pdf'], 'prompt', { maxContextCharacters: 13 });
    expect(result.context).toEqual(['fits', 'also fits']);
    expect(result.references.map((r) => r.content)).toEqual(result.context);
    expect(result.context.join('').length).toBeLessThanOrEqual(13);
  });

  it('does not deduplicate parent IDs across documents', async () => {
    const state = setup();
    state.sqlClient.mockResolvedValue([
      { content: 'A', parent_id: 'same', document: 'a.pdf' },
      { content: 'B', parent_id: 'same', document: 'b.pdf' },
    ]);
    state.rerank.mockResolvedValue([{ index: 0, score: 2 }, { index: 1, score: 1 }]);
    expect((await state.retrieve(['a.pdf', 'b.pdf'], 'prompt')).references).toHaveLength(2);
  });

  it.each([0, -1, 1.2, NaN, Infinity])('rejects invalid limits %s', (value) => {
    expect(() => resolveRetrievalOptions({ maxParents: value })).toThrow('positive integer');
  });
});
