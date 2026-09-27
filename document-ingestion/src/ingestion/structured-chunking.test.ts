import type { Block } from "@aws-sdk/client-textract";
import { describe, expect, it } from "vitest";
import { extractLayoutElements } from "./linearize-layout";
import { createStructuredChunks } from "./structured-chunking";
import { countEmbeddingTokens } from "./chunking";

function layout(id: string, type: Block["BlockType"], page: number, lineId: string): Block {
  return { Id: id, BlockType: type, Page: page, Relationships: [{ Type: "CHILD", Ids: [lineId] }] };
}

describe("structured Textract chunking", () => {
  it("groups text under section headings and links embedded children to parents", () => {
    const blocks: Block[] = [
      layout("heading-1", "LAYOUT_SECTION_HEADER", 1, "h1"),
      { Id: "h1", BlockType: "LINE", Page: 1, Text: "Fotossíntese" },
      layout("text-1", "LAYOUT_TEXT", 1, "l1"),
      { Id: "l1", BlockType: "LINE", Page: 1, Text: "As plantas absorvem luz solar." },
      layout("heading-2", "LAYOUT_SECTION_HEADER", 1, "h2"),
      { Id: "h2", BlockType: "LINE", Page: 1, Text: "Respiração celular" },
      layout("text-2", "LAYOUT_TEXT", 1, "l2"),
      { Id: "l2", BlockType: "LINE", Page: 1, Text: "As células liberam energia." },
    ];

    const result = createStructuredChunks(blocks, "book.pdf");
    expect(result.parents).toHaveLength(2);
    expect(result.children).toHaveLength(2);
    expect(result.parents[0].text).toContain("As plantas absorvem luz solar.");
    expect(result.parents[1].text).toContain("As células liberam energia.");
    expect(result.children[0]).toMatchObject({
      parentId: result.parents[0].id,
      pages: [1],
      heading: "Fotossíntese",
      blockIds: expect.arrayContaining(["heading-1", "text-1"]),
    });
    expect(createStructuredChunks(blocks, "book.pdf")).toEqual(result);
  });

  it("uses pages as parents when the material has no headings", () => {
    const blocks: Block[] = [
      layout("slide-1", "LAYOUT_TEXT", 1, "l1"),
      { Id: "l1", BlockType: "LINE", Page: 1, Text: "Primeiro slide" },
      layout("slide-2", "LAYOUT_TEXT", 2, "l2"),
      { Id: "l2", BlockType: "LINE", Page: 2, Text: "Segundo slide" },
    ];
    const result = createStructuredChunks(blocks, "slides.pdf");
    expect(result.parents.map((parent) => parent.pages)).toEqual([[1], [2]]);
    expect(result.children.map((child) => child.parentId)).toEqual(result.parents.map((parent) => parent.id));
  });

  it("reads nested lists once and recovers OCR text inside a figure", () => {
    const blocks: Block[] = [
      layout("list", "LAYOUT_LIST", 1, "list-text"),
      layout("list-text", "LAYOUT_TEXT", 1, "list-line"),
      { Id: "list-line", BlockType: "LINE", Page: 1, Text: "Item de lista" },
      {
        Id: "figure", BlockType: "LAYOUT_FIGURE", Page: 1,
        Geometry: { BoundingBox: { Left: 0.4, Top: 0.4, Width: 0.4, Height: 0.4 } },
      },
      {
        Id: "figure-line", BlockType: "LINE", Page: 1, Text: "Rótulo do gráfico",
        Geometry: { BoundingBox: { Left: 0.5, Top: 0.5, Width: 0.1, Height: 0.1 } },
      },
    ];
    const elements = extractLayoutElements(blocks);
    expect(elements.map((element) => element.text)).toEqual(["Item de lista", "Rótulo do gráfico"]);
    expect(elements[0].blockIds).toContain("list-line");
  });

  it("splits an oversized OCR paragraph within parent and embedding limits", () => {
    const blocks: Block[] = [
      layout("paragraph", "LAYOUT_TEXT", 1, "line"),
      { Id: "line", BlockType: "LINE", Page: 1, Text: "conteúdo ".repeat(2_000) },
    ];
    const result = createStructuredChunks(blocks, "long.pdf");
    expect(result.parents.length).toBeGreaterThan(1);
    expect(result.children.length).toBeGreaterThan(result.parents.length);
    expect(result.parents.every((parent) => countEmbeddingTokens(parent.text) <= 1_500)).toBe(true);
    expect(result.children.every((child) => countEmbeddingTokens(child.text) <= 350)).toBe(true);
  });
});
