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
      WITH chunks AS (
        WITH distances AS (
          SELECT id, pages, content, embedding <=> ${promptEmbeddingStr} AS distance
          FROM embeddings
          WHERE document = ANY(${documents})
        )
        SELECT id, pages, content, distance
        FROM distances
        WHERE distance <= 0.6
        ORDER BY distance
      )
      SELECT id, pages, content, distance
      FROM chunks
      ORDER BY pages
      LIMIT 5
    `;

    return (chunks as Array<{ content: string }>).map((chunk: { content: string }) => chunk.content);
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
