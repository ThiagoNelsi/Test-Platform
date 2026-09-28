import type { QuestionGenerationReference } from 'api-contracts';
import type { OpenAIClient, SqlClient } from './generator';
import type { Reranker } from './reranker';

export type RetrievalOptions = {
  candidateLimit: number;
  maxParents: number;
  maxContextCharacters: number;
  rerankTimeoutMs: number;
};

export const DEFAULT_RETRIEVAL_OPTIONS: Readonly<RetrievalOptions> = Object.freeze({
  candidateLimit: 40,
  maxParents: 5,
  maxContextCharacters: 14_000,
  rerankTimeoutMs: 3_000,
});

export function resolveRetrievalOptions(options: Partial<RetrievalOptions> = {}): RetrievalOptions {
  const resolved = { ...DEFAULT_RETRIEVAL_OPTIONS, ...options };
  for (const [name, value] of Object.entries(resolved)) {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new Error(`${name} must be a positive integer`);
    }
  }
  return resolved;
}

type RetrievedChunk = {
  content: string;
  document?: string;
  pages?: number[];
  parent_id?: string | null;
  parent_content?: string | null;
  parent_pages?: number[] | null;
  parent_heading?: string | null;
};

export type RetrievalResult = {
  context: string[];
  references: QuestionGenerationReference[];
};

export function createContextRetriever(deps: {
  openaiClient: Pick<OpenAIClient, 'embeddings'>;
  sqlClient: SqlClient;
  reranker?: Reranker;
  retrievalOptions?: Partial<RetrievalOptions>;
  onRerankFallback?: (error: unknown) => void;
}) {
  const defaults = resolveRetrievalOptions(deps.retrievalOptions);

  async function rank(chunks: RetrievedChunk[], query: string, timeoutMs: number) {
    if (!deps.reranker || chunks.length < 2) return chunks;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeout = new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`Reranking timed out after ${timeoutMs}ms`));
          controller.abort();
        }, timeoutMs);
      });
      // Promise.race also protects against providers that ignore cancellation.
      const results = await Promise.race([
        deps.reranker.rerank({
          query,
          documents: chunks.map((chunk) => chunk.parent_heading
            ? `${chunk.parent_heading}\n\n${chunk.content}` : chunk.content),
          signal: controller.signal,
        }),
        timeout,
      ]);
      const seen = new Set<number>();
      if (results.length !== chunks.length || results.some(({ index, score }) => {
        const invalid = !Number.isInteger(index) || index < 0 || index >= chunks.length
          || !Number.isFinite(score) || seen.has(index);
        seen.add(index);
        return invalid;
      })) throw new Error('Reranker returned an invalid or incomplete ranking');
      return [...results].sort((a, b) => b.score - a.score || a.index - b.index)
        .map(({ index }) => chunks[index]);
    } catch (error) {
      // Observability must not turn a recoverable provider error into a generation error.
      try {
        (deps.onRerankFallback ?? ((cause) => console.warn('Reranking failed; using vector order', cause)))(error);
      } catch { /* Preserve the fallback even if logging fails. */ }
      return chunks;
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }

  return async function retrieveContext(
    documents: string[], prompt: string, overrides: Partial<RetrievalOptions> = {},
  ): Promise<RetrievalResult> {
    const options = resolveRetrievalOptions({ ...defaults, ...overrides });
    if (documents.length === 0) return { context: [], references: [] };
    const embeddingResponse = await deps.openaiClient.embeddings.create({
      model: 'text-embedding-3-small', input: prompt, dimensions: 1024,
    });
    const promptEmbeddingStr = `[${embeddingResponse.data[0].embedding.join(',')}]`;
    const chunks: RetrievedChunk[] = await deps.sqlClient`
      WITH nearest AS (
        SELECT id, document, pages, content, parent_id,
               embedding <=> ${promptEmbeddingStr} AS distance
        FROM embeddings
        WHERE document = ANY(${documents})
        ORDER BY embedding <=> ${promptEmbeddingStr}
        LIMIT ${options.candidateLimit}
      )
      SELECT nearest.*, parent.content AS parent_content,
             parent.pages AS parent_pages, parent.heading AS parent_heading
      FROM nearest
      LEFT JOIN embedding_parents AS parent
        ON parent.id = nearest.parent_id AND parent.document = nearest.document
      ORDER BY nearest.distance
    `;
    const ranked = await rank(chunks, prompt, options.rerankTimeoutMs);
    const context: string[] = [];
    const references: QuestionGenerationReference[] = [];
    const seenParents = new Set<string>();
    let size = 0;
    for (const chunk of ranked) {
      const parentKey = chunk.parent_id ? JSON.stringify([chunk.document, chunk.parent_id]) : null;
      if (parentKey && seenParents.has(parentKey)) continue;
      const content = chunk.parent_content ?? chunk.content;
      const pages = chunk.parent_pages ?? chunk.pages ?? [];
      const source = chunk.parent_id
        ? `[Fonte: ${chunk.document ?? 'material'}, página(s) ${pages.join(', ')}` +
          (chunk.parent_heading ? `, seção: ${chunk.parent_heading}` : '') + `]\n` : '';
      const entry = source + content;
      // Skip an oversized parent so later, smaller matches can still fit.
      if (size + entry.length > options.maxContextCharacters) continue;
      context.push(entry);
      references.push({ document: chunk.document ?? 'material', title: chunk.parent_heading ?? null, pages, content });
      size += entry.length;
      if (parentKey) seenParents.add(parentKey);
      if (context.length >= options.maxParents) break;
    }
    return { context, references };
  };
}
