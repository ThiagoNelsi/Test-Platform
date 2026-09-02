import type { Socket } from 'socket.io';

export type GenerationSocket = Pick<Socket, 'emit'>;

export type GenerationChunk = {
  type: string;
  delta?: string;
  part?: {
    text?: string;
  };
};

export function formatChunkContext(chunkList: string[]): string {
  return chunkList.map((chunk, index) => `[Chunk ${index + 1}] ${chunk}\n`).join('');
}

export function buildQuestionMessages(prompt: string, chunkContext: string, promptTemplate: string) {
  return [
    {
      role: 'developer' as const,
      content: promptTemplate,
    },
    {
      role: 'user' as const,
      content: `[Chunks do material]\n${chunkContext}\n\n[Prompt do professor]\n${prompt}`,
    },
  ];
}

export function shouldUseLowReasoning(model: string): boolean {
  return !model.startsWith('gpt');
}

export function emitGenerationChunk(socket: GenerationSocket | undefined, chunk: GenerationChunk): void {
  if (!socket) {
    return;
  }

  switch (chunk.type) {
    case 'response.reasoning_summary_part.added':
      socket.emit('reasoning-started');
      break;
    case 'response.reasoning_summary_part.done':
      socket.emit('reasoning-finished');
      break;
    case 'response.reasoning_summary_text.delta':
      process.stdout.write(chunk.delta || '');
      socket.emit('reasoning-chunk', chunk.delta);
      break;
    case 'response.output_text.delta':
      process.stdout.write(chunk.delta || '');
      socket.emit('chunk', chunk.delta);
      break;
    case 'response.completed':
      socket.emit('generation-finished');
      break;
  }
}
