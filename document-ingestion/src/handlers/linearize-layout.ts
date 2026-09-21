import type { Block, BoundingBox, Relationship } from "@aws-sdk/client-textract";

function childIds(relationships: Relationship[] | undefined): string[] {
  return (relationships ?? [])
    .filter((relationship) => relationship.Type === "CHILD")
    .flatMap((relationship) => relationship.Ids ?? []);
}

function isInside(inner: BoundingBox, outer: BoundingBox): boolean {
  const innerRight = (inner.Left ?? 0) + (inner.Width ?? 0);
  const innerBottom = (inner.Top ?? 0) + (inner.Height ?? 0);
  const outerRight = (outer.Left ?? 0) + (outer.Width ?? 0);
  const outerBottom = (outer.Top ?? 0) + (outer.Height ?? 0);

  return (
    (inner.Left ?? 0) >= (outer.Left ?? 0) &&
    innerRight <= outerRight &&
    (inner.Top ?? 0) >= (outer.Top ?? 0) &&
    innerBottom <= outerBottom
  );
}

function blockText(
  rootId: string,
  blocksById: ReadonlyMap<string, Block>,
  figureBoxesByPage: ReadonlyMap<number, BoundingBox[]>,
): string[] {
  const lines: string[] = [];
  const stack = [rootId];
  const visited = new Set<string>();

  while (stack.length > 0) {
    const blockId = stack.pop();
    if (!blockId || visited.has(blockId)) continue;
    visited.add(blockId);

    const block = blocksById.get(blockId);
    if (!block) continue;

    if (block.BlockType === "LINE" && block.Text) {
      const boundingBox = block.Geometry?.BoundingBox;
      const figureBoxes = figureBoxesByPage.get(block.Page ?? 1) ?? [];
      const isFigureText =
        boundingBox !== undefined &&
        figureBoxes.some((figureBox) => isInside(boundingBox, figureBox));

      if (!isFigureText) lines.push(block.Text);
      continue;
    }

    const children = childIds(block.Relationships);
    for (let index = children.length - 1; index >= 0; index -= 1) {
      stack.push(children[index]);
    }
  }

  return lines;
}

/**
 * Converts Textract LAYOUT blocks into page text in Textract's reading order.
 * Figure-contained text is excluded, matching the Python implementation's default.
 */
export function linearizeLayout(blocks: Block[]): Map<number, string> {
  const blocksById = new Map(
    blocks
      .filter((block): block is Block & { Id: string } => Boolean(block.Id))
      .map((block) => [block.Id, block]),
  );
  const figureBoxesByPage = new Map<number, BoundingBox[]>();

  for (const block of blocks) {
    if (block.BlockType !== "LAYOUT_FIGURE" || !block.Geometry?.BoundingBox) continue;
    const page = block.Page ?? 1;
    const pageBoxes = figureBoxesByPage.get(page) ?? [];
    pageBoxes.push(block.Geometry.BoundingBox);
    figureBoxesByPage.set(page, pageBoxes);
  }

  const pageSections = new Map<number, string[]>();

  for (const block of blocks) {
    if (!block.Id || !block.BlockType?.startsWith("LAYOUT")) continue;

    const page = block.Page ?? 1;
    const text = blockText(block.Id, blocksById, figureBoxesByPage).join("\n");
    if (!text) continue;

    const sections = pageSections.get(page) ?? [];
    sections.push(text);
    pageSections.set(page, sections);
  }

  return new Map(
    [...pageSections.entries()]
      .sort(([left], [right]) => left - right)
      .map(([page, sections]) => [page, `${sections.join("\n\n")}\n\n`]),
  );
}
