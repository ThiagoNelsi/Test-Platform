import {
  RerankCommand,
  type RerankCommandOutput,
} from '@aws-sdk/client-bedrock-agent-runtime';
import type { RankedDocument, Reranker } from '../reranker';

type BedrockRerankClient = {
  send(command: RerankCommand, options: { abortSignal: AbortSignal }): Promise<RerankCommandOutput>;
};

/** All AWS request/response details stay behind the application Reranker interface. */
export function createBedrockReranker(client: BedrockRerankClient, modelArn: string): Reranker {
  return {
    async rerank({ query, documents, signal }) {
      if (documents.length === 0) return [];
      if (documents.length > 1000) throw new Error('Bedrock supports at most 1000 rerank sources');
      const results: RankedDocument[] = [];
      const tokens = new Set<string>();
      let nextToken: string | undefined;
      do {
        const response = await client.send(new RerankCommand({
          queries: [{ type: 'TEXT', textQuery: { text: query } }],
          sources: documents.map((text) => ({
            type: 'INLINE', inlineDocumentSource: { type: 'TEXT', textDocument: { text } },
          })),
          rerankingConfiguration: {
            type: 'BEDROCK_RERANKING_MODEL',
            bedrockRerankingConfiguration: {
              modelConfiguration: { modelArn }, numberOfResults: documents.length,
            },
          },
          ...(nextToken ? { nextToken } : {}),
        }), { abortSignal: signal });
        results.push(...(response.results ?? []).map((result) => ({
          index: result.index!, score: result.relevanceScore!,
        })));
        nextToken = response.nextToken;
        if (nextToken && tokens.has(nextToken)) throw new Error('Bedrock repeated a pagination token');
        if (nextToken) tokens.add(nextToken);
      } while (nextToken);
      return results;
    },
  };
}
