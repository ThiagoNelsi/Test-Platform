import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";
import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = workerUrl;

export async function renderPdfPreview(url: string, signal: AbortSignal, width: number, height: number): Promise<string> {
  signal.throwIfAborted();
  const loading = getDocument({
    url,
    withCredentials: false,
    disableAutoFetch: true,
    disableStream: true,
    useSystemFonts: true,
    useWasm: false,
  });
  const abort = () => { void loading.destroy().catch(() => {}); };
  signal.addEventListener("abort", abort, { once: true });
  try {
    const pdf = await loading.promise;
    const page = await pdf.getPage(1);
    signal.throwIfAborted();
    const original = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: Math.min(width / original.width, height / original.height) });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(viewport.width));
    canvas.height = Math.max(1, Math.round(viewport.height));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas unavailable");
    await page.render({ canvas, canvasContext: context, viewport }).promise;
    signal.throwIfAborted();
    return canvas.toDataURL("image/png");
  } finally {
    signal.removeEventListener("abort", abort);
    await loading.destroy();
  }
}
