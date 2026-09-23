import { describe, expect, it } from "vitest";
import { createBatches, getOverlapText, splitText, stableBatchId, type DocumentChunk } from "./chunking";

describe("document chunking", () => {
  it("keeps word boundaries and overlaps adjacent chunks", () => {
    const pages = new Map([
      [1, "one two three four five six seven eight nine ten"],
      [2, "eleven twelve"],
    ]);

    const chunks = splitText(pages, 30, 10);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].text.startsWith(" ")).toBe(false);
    expect(chunks[0].pages).toEqual([1]);
    expect(chunks.at(-1)?.pages).toContain(2);
    expect(chunks[1].text).toContain(getOverlapText(chunks[0].text, 10));
  });

  it("does not emit an empty chunk for a word larger than the chunk limit", () => {
    const chunks = splitText(new Map([[1, "extraordinarily-long-word"]]), 20, 5);

    expect(chunks).toEqual([
      { text: "extraordinarily-long-word", pages: [1] },
    ]);
  });

  it("places an oversized chunk in its own batch without adding an empty batch", () => {
    const chunks: DocumentChunk[] = [
      { text: "oversized", pages: [1] },
      { text: "small", pages: [2] },
    ];

    const countTokens = (text: string) => (text === "oversized" ? 11 : 2);
    const batches = createBatches(chunks, 10, countTokens, "job-1");

    expect(batches).toEqual([
      { id: stableBatchId("job-1", 0, [chunks[0]]), chunks: [chunks[0]], size: 11, pages: [1] },
      { id: stableBatchId("job-1", 1, [chunks[1]]), chunks: [chunks[1]], size: 2, pages: [2] },
    ]);
    expect(createBatches(chunks, 10, countTokens, "job-1")).toEqual(batches);
  });
});
