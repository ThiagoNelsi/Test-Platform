import { createRequire } from "node:module";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const fromPdf = createRequire(require.resolve("pdfjs-dist/package.json"));
const { createCanvas, DOMMatrix, ImageData, Path2D, loadImage } = fromPdf("@napi-rs/canvas");
let directory: string;
let renderPdfPreview: typeof import("./pdf-preview").renderPdfPreview;

// Two pages with distinct solid colors make first-page selection measurable.
function twoPagePdf() {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 300] /Resources << >> /Contents 4 0 R >>",
    "<< /Length 26 >>\nstream\n1 0 0 rg 0 0 200 300 re f\nendstream",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 300] /Resources << >> /Contents 6 0 R >>",
    "<< /Length 26 >>\nstream\n0 0 1 rg 0 0 200 300 re f\nendstream",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const start = Buffer.byteLength(pdf);
  pdf += `xref\n0 7\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
  return pdf;
}

beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), "material-preview-"));
  vi.stubGlobal("DOMMatrix", DOMMatrix);
  vi.stubGlobal("ImageData", ImageData);
  vi.stubGlobal("Path2D", Path2D);
  vi.stubGlobal("document", { createElement: () => createCanvas(1, 1) });
  ({ renderPdfPreview } = await import("./pdf-preview"));
  const { GlobalWorkerOptions } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  GlobalWorkerOptions.workerSrc = pathToFileURL(require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs")).href;
});

afterAll(async () => {
  vi.unstubAllGlobals();
  await rm(directory, { recursive: true, force: true });
});

describe("PDF material preview", () => {
  it("renders the first page as a compact PNG with its original proportions", async () => {
    const path = join(directory, "two-pages.pdf");
    await writeFile(path, twoPagePdf());
    const result = await renderPdfPreview(path, new AbortController().signal, 128, 176);
    const image = await loadImage(result);
    expect(image.width).toBe(117);
    expect(image.height).toBe(176);
    const canvas = createCanvas(image.width, image.height);
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0);
    expect([...context.getImageData(50, 50, 1, 1).data]).toEqual([255, 0, 0, 255]);
  });

  it("rejects an invalid PDF so the card can keep its fallback icon", async () => {
    const path = join(directory, "invalid.pdf");
    await writeFile(path, "not a PDF");
    await expect(renderPdfPreview(path, new AbortController().signal, 128, 176)).rejects.toThrow();
  });

  it("does not load a document when the request has already been cancelled", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(renderPdfPreview("missing.pdf", controller.signal, 128, 176)).rejects.toMatchObject({ name: "AbortError" });
  });
});
