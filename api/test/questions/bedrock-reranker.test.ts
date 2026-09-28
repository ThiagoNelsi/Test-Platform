import { describe, expect, it, vi } from 'vitest';
import { RerankCommand } from '@aws-sdk/client-bedrock-agent-runtime';
import { createBedrockReranker } from '../../src/questions/adapters/bedrock-reranker';

const modelArn = 'arn:aws:bedrock:us-east-1::foundation-model/cohere.rerank-v3-5:0';
const request = { query: 'liberalismo', documents: ['Estado', 'Teoria liberal'], signal: new AbortController().signal };

describe('Bedrock reranker adapter', () => {
  it('translates the domain request and maps results without AWS types escaping', async () => {
    const send = vi.fn().mockResolvedValue({ results: [
      { index: 1, relevanceScore: 0.9 }, { index: 0, relevanceScore: 0.1 },
    ] });
    await expect(createBedrockReranker({ send }, modelArn).rerank(request)).resolves.toEqual([
      { index: 1, score: 0.9 }, { index: 0, score: 0.1 },
    ]);
    const [command, options] = send.mock.calls[0];
    expect(command).toBeInstanceOf(RerankCommand);
    expect(command.input).toEqual({
      queries: [{ type: 'TEXT', textQuery: { text: 'liberalismo' } }],
      sources: request.documents.map((text) => ({
        type: 'INLINE', inlineDocumentSource: { type: 'TEXT', textDocument: { text } },
      })),
      rerankingConfiguration: {
        type: 'BEDROCK_RERANKING_MODEL',
        bedrockRerankingConfiguration: { modelConfiguration: { modelArn }, numberOfResults: 2 },
      },
    });
    expect(options.abortSignal).toBe(request.signal);
  });

  it('collects paginated results', async () => {
    const send = vi.fn()
      .mockResolvedValueOnce({ results: [{ index: 1, relevanceScore: 0.9 }], nextToken: 'page2' })
      .mockResolvedValueOnce({ results: [{ index: 0, relevanceScore: 0.1 }] });
    await expect(createBedrockReranker({ send }, modelArn).rerank(request)).resolves.toHaveLength(2);
    expect(send.mock.calls[1][0].input.nextToken).toBe('page2');
  });

  it('rejects repeated pagination tokens', async () => {
    const send = vi.fn().mockResolvedValue({ results: [], nextToken: 'same' });
    await expect(createBedrockReranker({ send }, modelArn).rerank(request)).rejects.toThrow('pagination');
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('propagates AWS errors so the application can fall back', async () => {
    const error = new Error('AccessDeniedException');
    const send = vi.fn().mockRejectedValue(error);
    await expect(createBedrockReranker({ send }, modelArn).rerank(request)).rejects.toBe(error);
  });

  it('avoids empty requests and rejects more than 1000 sources', async () => {
    const send = vi.fn();
    const adapter = createBedrockReranker({ send }, modelArn);
    await expect(adapter.rerank({ ...request, documents: [] })).resolves.toEqual([]);
    await expect(adapter.rerank({ ...request, documents: Array(1001).fill('x') })).rejects.toThrow('1000');
    expect(send).not.toHaveBeenCalled();
  });
});
