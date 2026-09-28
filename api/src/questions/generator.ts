import type OpenAI from 'openai';
import type { Socket } from 'socket.io';
import { enemPrompt } from './prompt';
import { createContextRetriever, type RetrievalOptions } from './retrieval';
import type { Reranker } from './reranker';
import {
  buildQuestionMessages,
  emitGenerationChunk,
  formatChunkContext,
  shouldUseLowReasoning,
  type GenerationChunk,
} from './chunks';

type ResponseStreamChunk = GenerationChunk;

export type SqlClient = any;

export type OpenAIClient = Pick<OpenAI, 'embeddings' | 'responses'>;

export type QuestionGeneratorDeps = {
  openaiClient: OpenAIClient;
  sqlClient: SqlClient;
  promptTemplate?: string;
  reranker?: Reranker;
  retrievalOptions?: Partial<RetrievalOptions>;
  onRerankFallback?: (error: unknown) => void;
};

export function createQuestionGenerator(deps: QuestionGeneratorDeps) {
  const retrieveContext = createContextRetriever(deps);

  async function getChunks(
    documents: string[], prompt: string, options?: Partial<RetrievalOptions>,
  ): Promise<string[]> {
    return (await retrieveContext(documents, prompt, options)).context;
  }

  async function generateQuestion(
    prompt: string,
    model: string,
    documents: string[] = [],
    socket?: Pick<Socket, 'emit'>,
    options?: Partial<RetrievalOptions>,
  ): Promise<void> {
    if (!prompt) {
      throw new Error('Prompt is required');
    }

    let chunkContext = '';

    if (documents.length > 0) {
      const { context, references } = await retrieveContext(documents, prompt, options);

      chunkContext = formatChunkContext(context);
      socket?.emit('generation-context', references);
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
    retrieveContext,
    getChunks,
    generateQuestion,
  };
}
