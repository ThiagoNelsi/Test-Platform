import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { Resource } from "@/lib/types";
import ResourceCard from "./resource-card";

function render(overrides: Partial<Resource> = {}) {
  const material = {
    id: 11, documentId: "doc", filename: "Filosofia.pdf", tags: ["Filosofia"],
    objectKey: "original.pdf", status: "PROCESSED", fileType: "application/pdf",
    ownerId: 1, deletedAt: null, fileSize: 1024, fileHash: null, jobId: null,
    createdAt: new Date(), updatedAt: new Date(), processedAt: new Date(), ...overrides,
  } satisfies Resource;
  return renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter><ResourceCard resource={material} /></MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("material actions", () => {
  it("offers editing, original file access and generation for a ready material", () => {
    const html = render();
    expect(html).toContain("Abrir");
    expect(html).toContain("Baixar");
    expect(html).toContain("Editar");
    expect(html).toContain('href="/questoes/criar?tab=ai&amp;resourceId=11"');
    expect(html).toContain('aria-label="Excluir Filosofia.pdf"');
    expect(html).not.toContain("Restaurar");
  });

  it("offers only restoration for materials in the trash", () => {
    const html = render({ deletedAt: new Date("2026-09-28T12:00:00Z") });
    expect(html).toContain("Restaurar");
    for (const text of ["Abrir", "Baixar", "Editar", "Gerar questões", "Excluir Filosofia.pdf"]) {
      expect(html).not.toContain(text);
    }
  });

  it("keeps failed originals accessible and removes the generation link", () => {
    const html = render({ status: "FAILED" });
    expect(html).toContain("Abrir");
    expect(html).toContain("Baixar");
    expect(html).not.toContain('href="/questoes/criar');
  });
});
