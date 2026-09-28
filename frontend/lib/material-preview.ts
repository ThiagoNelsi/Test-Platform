const WIDTH = 128;
const HEIGHT = 176;

function createCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas indisponível");
  return { canvas, context };
}

export async function renderMaterialPreview(url: string, fileType: string, signal: AbortSignal): Promise<string> {
  signal.throwIfAborted();
  if (fileType !== "application/pdf") {
    const response = await fetch(url, { signal, credentials: "omit" });
    if (!response.ok) throw new Error("Arquivo indisponível");
    const image = await createImageBitmap(await response.blob());
    try {
      signal.throwIfAborted();
      const scale = Math.min(WIDTH / image.width, HEIGHT / image.height);
      const { canvas, context } = createCanvas(image.width * scale, image.height * scale);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/png");
    } finally {
      image.close();
    }
  }

  // Keep the PDF renderer and worker out of the initial application bundle.
  const { renderPdfPreview } = await import("./pdf-preview");
  signal.throwIfAborted();
  return renderPdfPreview(url, signal, WIDTH, HEIGHT);
}
