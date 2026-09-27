import type OpenAI from 'openai';
import type { Socket } from 'socket.io';
import { enemPrompt } from './prompt';
import {
  buildQuestionMessages,
  emitGenerationChunk,
  formatChunkContext,
  shouldUseLowReasoning,
  type GenerationChunk,
} from './chunks';

type EmbeddingResult = {
  data: Array<{ embedding: number[] }>;
};

type ResponseStreamChunk = GenerationChunk;

export type SqlClient = any;

export type OpenAIClient = Pick<OpenAI, 'embeddings' | 'responses'>;

export type QuestionGeneratorDeps = {
  openaiClient: OpenAIClient;
  sqlClient: SqlClient;
  promptTemplate?: string;
};

export function createQuestionGenerator(deps: QuestionGeneratorDeps) {
  async function getChunks(documents: string[], prompt: string): Promise<string[]> {
    const embeddingResponse = (await deps.openaiClient.embeddings.create({
      model: 'text-embedding-3-small',
      input: prompt,
      dimensions: 1024,
    })) as EmbeddingResult;

    const promptEmbedding = embeddingResponse.data[0].embedding;
    const promptEmbeddingStr = `[${promptEmbedding.join(',')}]`;

    const chunks = await deps.sqlClient`
      WITH nearest AS (
        SELECT id, document, pages, content, parent_id,
               embedding <=> ${promptEmbeddingStr} AS distance
        FROM embeddings
        WHERE document = ANY(${documents})
        ORDER BY embedding <=> ${promptEmbeddingStr}
        LIMIT 40
      )
      SELECT nearest.*, parent.content AS parent_content,
             parent.pages AS parent_pages, parent.heading AS parent_heading
      FROM nearest
      LEFT JOIN embedding_parents AS parent
        ON parent.id = nearest.parent_id AND parent.document = nearest.document
      ORDER BY nearest.distance
    `;

    type RetrievedChunk = {
      content: string;
      document?: string;
      pages?: number[];
      parent_id?: string | null;
      parent_content?: string | null;
      parent_pages?: number[] | null;
      parent_heading?: string | null;
    };
    const context: string[] = [];
    const seenParents = new Set<string>();
    let size = 0;
    for (const chunk of chunks as RetrievedChunk[]) {
      if (chunk.parent_id && seenParents.has(chunk.parent_id)) continue;
      const content = chunk.parent_content ?? chunk.content;
      const pages = chunk.parent_pages ?? chunk.pages ?? [];
      const source = chunk.parent_id
        ? `[Fonte: ${chunk.document ?? 'material'}, página(s) ${pages.join(', ')}` +
          (chunk.parent_heading ? `, seção: ${chunk.parent_heading}` : '') + `]\n`
        : '';
      const entry = source + content;
      if (context.length > 0 && size + entry.length > 14_000) break;
      context.push(entry);
      size += entry.length;
      if (chunk.parent_id) seenParents.add(chunk.parent_id);
      if (context.length >= 5) break;
    }
    return context;
  }

  async function generateQuestion(
    prompt: string,
    model: string,
    documents: string[] = [],
    socket?: Pick<Socket, 'emit'>,
  ): Promise<void> {
    if (!prompt) {
      throw new Error('Prompt is required');
    }

    let chunkContext = '';

    if (documents.length > 0) {
      const chunkList = await getChunks(documents, prompt);

      chunkContext = formatChunkContext(chunkList);
    }

    const stream = (await deps.openaiClient.responses.create({
      model,
      input: buildQuestionMessages(prompt, chunkContext, deps.promptTemplate || enemPrompt),
      stream: true,
      reasoning: {
        summary: 'auto',
        effort: shouldUseLowReasoning(model) ? 'low' : undefined,
      },
    })) as AsyncIterable<ResponseStreamChunk>;

    for await (const chunk of stream) {
      emitGenerationChunk(socket, chunk);
    }
  }

  return {
    getChunks,
    generateQuestion,
  };
}
