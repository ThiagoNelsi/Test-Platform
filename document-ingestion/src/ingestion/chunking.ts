import { createHash, randomUUID } from "node:crypto";
import { encodingForModel } from "js-tiktoken";

export type DocumentChunk = {
  text: string;
  pages: number[];
  id?: string;
  parentId?: string;
  heading?: string;
  blockIds?: string[];
  version?: number;
};

export type ParentChunk = {
  id: string;
  text: string;
  pages: number[];
  heading: string;
  blockIds: string[];
  version: number;
};

export type ChunkBatch = {
  id: string;
  chunks: DocumentChunk[];
  size: number;
  pages: number[];
  parents?: ParentChunk[];
};

export function stableBatchId(jobId: string, index: number, chunks: DocumentChunk[]): string {
  return createHash("sha256")
    .update(`${jobId}:${index}:${JSON.stringify(chunks)}`)
    .digest("hex");
}

const encoder = encodingForModel("text-embedding-3-small");

export function countEmbeddingTokens(text: string): number {
  return encoder.encode(text).length;
}

export function embeddingTokenPrefixLength(text: string, tokenCount: number): number {
  return encoder.decode(encoder.encode(text).slice(0, tokenCount)).length;
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
  jobId?: string,
  parents?: ParentChunk[],
): ChunkBatch[] {
  if (batchSize <= 0) throw new Error("batchSize must be greater than zero");

  const batches: ChunkBatch[] = [];
  let currentChunks: DocumentChunk[] = [];
  let currentSize = 0;
  const parentsById = new Map(parents?.map((parent) => [parent.id, parent]));
  const payloadBytes = (items: DocumentChunk[]): number => {
    const referencedParents = [...new Set(items.flatMap((chunk) => chunk.parentId ? [chunk.parentId] : []))]
      .map((id) => parentsById.get(id));
    return Buffer.byteLength(JSON.stringify({ chunks: items, parents: referencedParents }));
  };

  const flush = () => {
    if (currentChunks.length === 0) return;

    const batchParents = [...new Set(currentChunks.flatMap((chunk) => chunk.parentId ? [chunk.parentId] : []))]
      .map((id) => parentsById.get(id));
    if (parents && batchParents.some((parent) => !parent)) {
      throw new Error("Chunk references a missing parent");
    }
    batches.push({
      id: jobId ? stableBatchId(jobId, batches.length, currentChunks) : randomUUID(),
      chunks: currentChunks,
      size: currentSize,
      pages: Array.from(new Set(currentChunks.flatMap((chunk) => chunk.pages))).sort((a, b) => a - b),
      ...(parents ? { parents: batchParents as ParentChunk[] } : {}),
    });

    currentChunks = [];
    currentSize = 0;
  };

  for (const chunk of chunks) {
    const tokenCount = countTokens(chunk.text);

    if (currentChunks.length > 0 &&
      (currentSize + tokenCount > batchSize || payloadBytes([...currentChunks, chunk]) > 200_000)) {
      flush();
    }

    if (payloadBytes([chunk]) > 200_000) {
      throw new Error("Chunk and parent exceed the batch message budget");
    }

    currentChunks.push(chunk);
    currentSize += tokenCount;
  }

  flush();
  return batches;
}
