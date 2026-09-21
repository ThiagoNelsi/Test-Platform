import type { Block } from "@aws-sdk/client-textract";
import { describe, expect, it } from "vitest";
import { linearizeLayout } from "./linearize-layout";

describe("Textract layout linearization", () => {
  it("preserves page and layout order while excluding figure text", () => {
    const blocks: Block[] = [
      {
        Id: "layout-1",
        BlockType: "LAYOUT_TEXT",
        Page: 1,
        Relationships: [{ Type: "CHILD", Ids: ["line-1"] }],
      },
      {
        Id: "line-1",
        BlockType: "LINE",
        Page: 1,
        Text: "Visible text",
        Geometry: { BoundingBox: { Left: 0, Top: 0, Width: 0.3, Height: 0.1 } },
      },
      {
        Id: "figure",
        BlockType: "LAYOUT_FIGURE",
        Page: 1,
        Relationships: [{ Type: "CHILD", Ids: ["figure-line"] }],
        Geometry: { BoundingBox: { Left: 0.5, Top: 0.5, Width: 0.4, Height: 0.4 } },
      },
      {
        Id: "figure-line",
        BlockType: "LINE",
        Page: 1,
        Text: "Hidden figure text",
        Geometry: { BoundingBox: { Left: 0.6, Top: 0.6, Width: 0.1, Height: 0.1 } },
      },
      {
        Id: "layout-2",
        BlockType: "LAYOUT_TEXT",
        Page: 2,
        Relationships: [{ Type: "CHILD", Ids: ["line-2"] }],
      },
      { Id: "line-2", BlockType: "LINE", Page: 2, Text: "Second page" },
    ];

    expect([...linearizeLayout(blocks)]).toEqual([
      [1, "Visible text\n\n"],
      [2, "Second page\n\n"],
    ]);
  });
});
