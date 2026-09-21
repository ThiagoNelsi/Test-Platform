import { encodingForModel } from "js-tiktoken";

export type DocumentChunk = {
  text: string;
  pages: number[];
};

export type ChunkBatch = {
  chunks: DocumentChunk[];
  size: number;
};

const encoder = encodingForModel("text-embedding-3-small");

export function countEmbeddingTokens(text: string): number {
  return encoder.encode(text).length;
}

export function getOverlapText(text: string, overlapSize: number): string {
  const words = text.split(/\s+/).filter(Boolean);
  const overlap: string[] = [];
  let size = 0;

  for (let index = words.length - 1; index >= 0; index -= 1) {
    const word = words[index];
    const wordSize = word.length + 1;

    if (size + wordSize > overlapSize) break;

    overlap.push(word);
    size += wordSize;
  }

  return overlap.reverse().join(" ");
}

export function splitText(
  pages: ReadonlyMap<number, string>,
  chunkSize: number,
  chunkOverlap: number,
): DocumentChunk[] {
  if (chunkSize <= 0) throw new Error("chunkSize must be greater than zero");
  if (chunkOverlap < 0 || chunkOverlap >= chunkSize) {
    throw new Error("chunkOverlap must be non-negative and smaller than chunkSize");
  }

  const chunks: DocumentChunk[] = [];
  let currentWords: string[] = [];
  let currentPages = new Set<number>();
  let currentSize = 0;
  let overlap = "";

  const flush = () => {
    if (currentWords.length === 0) return;

    const text = currentWords.join(" ");
    chunks.push({
      text: [overlap, text].filter(Boolean).join(" "),
      pages: [...currentPages].sort((left, right) => left - right),
    });

    overlap = getOverlapText(text, chunkOverlap);
    currentWords = [];
    currentPages = new Set<number>();
    currentSize = 0;
  };

  for (const [pageNumber, text] of pages) {
    for (const word of text.split(/\s+/).filter(Boolean)) {
      const wordSize = word.length + 1;

      // Do not emit an empty chunk when a single word is larger than the limit.
      if (
        currentWords.length > 0 &&
        currentSize + wordSize + chunkOverlap > chunkSize
      ) {
        flush();
      }

      currentWords.push(word);
      currentPages.add(pageNumber);
      currentSize += wordSize;
    }
  }

  flush();
  return chunks;
}

export function createBatches(
  chunks: DocumentChunk[],
  batchSize: number,
  countTokens: (text: string) => number = countEmbeddingTokens,
): ChunkBatch[] {
  if (batchSize <= 0) throw new Error("batchSize must be greater than zero");

  const batches: ChunkBatch[] = [];
  let currentChunks: DocumentChunk[] = [];
  let currentSize = 0;

  const flush = () => {
    if (currentChunks.length === 0) return;
    batches.push({ chunks: currentChunks, size: currentSize });
    currentChunks = [];
    currentSize = 0;
  };

  for (const chunk of chunks) {
    const tokenCount = countTokens(chunk.text);

    if (currentChunks.length > 0 && currentSize + tokenCount > batchSize) {
      flush();
    }

    currentChunks.push(chunk);
    currentSize += tokenCount;
  }

  flush();
  return batches;
}
