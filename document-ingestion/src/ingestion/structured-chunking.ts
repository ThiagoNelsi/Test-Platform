import { createHash } from "node:crypto";
import type { Block } from "@aws-sdk/client-textract";
import {
  countEmbeddingTokens,
  embeddingTokenPrefixLength,
  type DocumentChunk,
  type ParentChunk,
} from "./chunking";
import { extractLayoutElements, type LayoutElement } from "./linearize-layout";

const VERSION = 2;
const PARENT_TOKEN_LIMIT = 1_500;
const CHILD_TOKEN_LIMIT = 350;

function stableId(document: string, kind: string, index: number, text: string): string {
  return createHash("sha256")
    .update(`${document}:${VERSION}:${kind}:${index}:${text}`)
    .digest("hex");
}

function splitLongText(text: string, limit: number): string[] {
  if (countEmbeddingTokens(text) <= limit) return [text];
  const parts: string[] = [];
  let remaining = text.trim();
  while (countEmbeddingTokens(remaining) > limit) {
    const approximate = Math.max(1, embeddingTokenPrefixLength(remaining, Math.max(1, limit - 16)));
    const target = Math.min(approximate, remaining.length - 1);
    const whitespace = remaining.lastIndexOf(" ", target);
    let cut = whitespace > target / 2 ? whitespace : target;
    // A token boundary can fall inside a multibyte character or OCR word.
    // Cut the original string, then verify its actual token count.
    if (countEmbeddingTokens(remaining.slice(0, cut)) > limit) {
      let low = 1;
      let high = cut;
      while (low < high) {
        const middle = Math.ceil((low + high) / 2);
        if (countEmbeddingTokens(remaining.slice(0, middle)) <= limit) low = middle;
        else high = middle - 1;
      }
      cut = low;
    }
    parts.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trimStart();
  }
  if (remaining) parts.push(remaining);
  return parts;
}

function pagesOf(elements: LayoutElement[]): number[] {
  return [...new Set(elements.map((element) => element.page))].sort((a, b) => a - b);
}

function idsOf(elements: LayoutElement[]): string[] {
  return [...new Set(elements.flatMap((element) => element.blockIds))];
}

export function createStructuredChunks(blocks: Block[], document: string): {
  parents: ParentChunk[];
  children: DocumentChunk[];
} {
  const elements = extractLayoutElements(blocks);
  const parents: ParentChunk[] = [];
  const children: DocumentChunk[] = [];
  let group: LayoutElement[] = [];
  let heading = "";
  let parentIndex = 0;
  const pageTokens = new Map<number, number>();
  for (const element of elements) {
    pageTokens.set(element.page, (pageTokens.get(element.page) ?? 0) + countEmbeddingTokens(element.text));
  }

  function flushParent(): void {
    if (group.length === 0) return;
    const shortHeading = splitLongText(heading, 100)[0] ?? "";
    const startsWithHeading = group[0].type === "LAYOUT_TITLE" || group[0].type === "LAYOUT_SECTION_HEADER";
    const content = [startsWithHeading ? "" : shortHeading, ...group.map((element) => element.text)]
      .filter(Boolean).join("\n\n");
    const parent: ParentChunk = {
      id: stableId(document, "parent", parentIndex++, content),
      text: content,
      pages: pagesOf(group),
      heading,
      blockIds: idsOf(group),
      version: VERSION,
    };
    parents.push(parent);

    let childElements: LayoutElement[] = [];
    let childText = "";
    function flushChild(): void {
      if (!childText) return;
      const beginsWithHeading = childElements[0].type === "LAYOUT_TITLE" ||
        childElements[0].type === "LAYOUT_SECTION_HEADER";
      const embeddingText = [beginsWithHeading ? "" : shortHeading, childText]
        .filter(Boolean).join("\n\n");
      children.push({
        id: stableId(document, "child", children.length, embeddingText),
        parentId: parent.id,
        text: embeddingText,
        pages: pagesOf(childElements),
        heading,
        blockIds: idsOf(childElements),
        version: VERSION,
      });
      childElements = [];
      childText = "";
    }

    for (const element of group) {
      for (const part of splitLongText(element.text, CHILD_TOKEN_LIMIT - countEmbeddingTokens(shortHeading) - 8)) {
        const next = childText ? `${childText}\n\n${part}` : part;
        if (childText && countEmbeddingTokens([shortHeading, next].filter(Boolean).join("\n\n")) > CHILD_TOKEN_LIMIT) {
          flushChild();
        }
        childText = childText ? `${childText}\n\n${part}` : part;
        childElements.push(element);
      }
    }
    flushChild();
    group = [];
  }

  const hasHeadings = elements.some((element) =>
    element.type === "LAYOUT_TITLE" || element.type === "LAYOUT_SECTION_HEADER",
  );
  for (const element of elements) {
    const isHeading = element.type === "LAYOUT_TITLE" || element.type === "LAYOUT_SECTION_HEADER";
    if (isHeading) {
      flushParent();
      heading = element.text;
      group.push(element);
      continue;
    }

    for (const part of splitLongText(element.text, PARENT_TOKEN_LIMIT - 150)) {
      const fragment = { ...element, text: part };
      const pageChanged = group.length > 0 && group[group.length - 1].page !== fragment.page;
      const pageFallback = pageChanged && (!hasHeadings ||
        (pageTokens.get(group[group.length - 1].page) ?? 0) <= 250 ||
        (pageTokens.get(fragment.page) ?? 0) <= 250);
      const nextText = [heading, ...group.map((item) => item.text), fragment.text].filter(Boolean).join("\n\n");
      if (group.length > 0 && (pageFallback || countEmbeddingTokens(nextText) > PARENT_TOKEN_LIMIT)) {
        flushParent();
      }
      group.push(fragment);
    }
  }
  flushParent();
  return { parents, children };
}
