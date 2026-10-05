import { useCallback, useEffect, useRef, useState } from "react";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import { ExternalLink, Minus, Plus, X } from "lucide-react";
import type { Resource } from "@/lib/types";
import { getResourceFile } from "@/lib/resource-service";
import { getApiErrorMessage } from "@/lib/backend-api";
import { errorToast } from "@/lib/toasters";
import { Button } from "@/src/components/ui/button";

GlobalWorkerOptions.workerSrc = workerUrl;

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;

type PdfPageProps = {
  pdf: PDFDocumentProxy;
  number: number;
  zoom: number;
  availableWidth: number;
  estimatedAspect: number;
  scrollRoot: React.RefObject<HTMLDivElement | null>;
  onError: (error: unknown) => void;
};

function PdfPage({ pdf, number, zoom, availableWidth, estimatedAspect, scrollRoot, onError }: PdfPageProps) {
  const container = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const activeRender = useRef<RenderTask | null>(null);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    if (!container.current || !scrollRoot.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { root: scrollRoot.current, rootMargin: "600px 0px" },
    );
    observer.observe(container.current);
    return () => observer.disconnect();
  }, [scrollRoot]);

  useEffect(() => {
    if (!visible || !canvas.current || availableWidth < 1) return;
    let cancelled = false;
    let task: RenderTask | null = null;
    setReady(false);
    (async () => {
      try {
        if (activeRender.current) {
          activeRender.current.cancel();
          await activeRender.current.promise.catch(() => {});
        }
        if (cancelled) return;
        const page = await pdf.getPage(number);
        if (cancelled || !canvas.current) return;
        const initial = page.getViewport({ scale: 1 });
        const scale = Math.min(1.5, Math.max(0.1, (availableWidth - 32) / initial.width)) * zoom;
        const viewport = page.getViewport({ scale });
        setSize({ width: viewport.width, height: viewport.height });
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const element = canvas.current;
        element.width = Math.ceil(viewport.width * ratio);
        element.height = Math.ceil(viewport.height * ratio);
        element.style.width = `${viewport.width}px`;
        element.style.height = `${viewport.height}px`;
        const context = element.getContext("2d");
        if (!context) throw new Error("Canvas indisponível");
        task = page.render({ canvas: element, canvasContext: context, viewport, transform: [ratio, 0, 0, ratio, 0, 0] });
        activeRender.current = task;
        await task.promise;
        if (!cancelled) setReady(true);
      } catch (reason) {
        if (!cancelled) onError(reason);
      } finally {
        if (activeRender.current === task) activeRender.current = null;
      }
    })();
    return () => { cancelled = true; task?.cancel(); };
  }, [pdf, number, zoom, availableWidth, visible, onError]);

  const estimate = Math.max(100, (availableWidth - 32) * estimatedAspect * zoom);
  const width = size?.width ?? Math.max(100, (availableWidth - 32) * zoom);
  const height = size?.height ?? estimate;

  return (
    <section ref={container} aria-label={`Página ${number}`} className="w-max min-w-full">
      <p className="mb-2 text-center text-xs font-medium text-muted-foreground">Página {number} / {pdf?.numPages}</p>
      <div className="mx-auto bg-white shadow-md" style={{ width, minHeight: height }}>
        {visible && <canvas ref={canvas} aria-label={`Conteúdo da página ${number}`} className={ready ? "block" : "block opacity-50"} />}
      </div>
    </section>
  );
}

export default function PdfSidePanel({ resource, onClose }: { resource: Resource; onClose: () => void }) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [zoom, setZoom] = useState(1);
  const [openingTab, setOpeningTab] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [availableWidth, setAvailableWidth] = useState(0);
  const [estimatedAspect, setEstimatedAspect] = useState(1.4);
  const pageArea = useRef<HTMLDivElement>(null);
  const resumeScroll = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    let loading: ReturnType<typeof getDocument> | null = null;
    setPdf(null);
    setError(null);
    (async () => {
      try {
        const { url } = await getResourceFile(resource.id, false, controller.signal);
        if (controller.signal.aborted) return;
        loading = getDocument({
          url,
          withCredentials: false,
          disableAutoFetch: false,
          disableStream: false,
          useSystemFonts: true,
          useWasm: false,
        });
        const document = await loading.promise;
        if (controller.signal.aborted) return;
        const firstPage = await document.getPage(1);
        const viewport = firstPage.getViewport({ scale: 1 });
        if (!controller.signal.aborted) {
          setEstimatedAspect(viewport.height / viewport.width);
          setPdf(document);
        }
      } catch (reason) {
        if (!controller.signal.aborted) setError(getApiErrorMessage(reason, "Não foi possível carregar o PDF."));
      }
    })();
    return () => {
      controller.abort();
      if (loading) void loading.destroy().catch(() => {});
    };
  }, [resource.id, reload]);

  useEffect(() => {
    if (!pageArea.current) return;
    const observer = new ResizeObserver(([entry]) => setAvailableWidth(entry.contentRect.width));
    observer.observe(pageArea.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (pdf && resumeScroll.current && pageArea.current) {
      pageArea.current.scrollTop = resumeScroll.current;
      resumeScroll.current = 0;
    }
  }, [pdf]);

  function retry() {
    resumeScroll.current = pageArea.current?.scrollTop ?? 0;
    setReload((value) => value + 1);
  }

  const showPageError = useCallback((reason: unknown) => {
    setError(getApiErrorMessage(reason, "Não foi possível renderizar uma página."));
  }, []);

  async function openInNewTab() {
    const tab = window.open("about:blank", "_blank");
    if (!tab) { errorToast("Permita abrir uma nova aba para visualizar o PDF."); return; }
    tab.opener = null;
    setOpeningTab(true);
    try {
      const { url } = await getResourceFile(resource.id, false);
      tab.location.replace(url);
    } catch (reason) {
      tab.close();
      errorToast(getApiErrorMessage(reason, "Não foi possível abrir o PDF em outra aba."));
    } finally {
      setOpeningTab(false);
    }
  }

  return (
    <aside aria-label={`Visualizador de ${resource.filename}`} className="flex h-full min-h-0 flex-col overflow-hidden border-l border-gray-200 bg-white shadow-xl">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold" title={resource.filename}>{resource.filename}</h2>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" aria-label="Diminuir zoom" disabled={zoom <= MIN_ZOOM} onClick={() => setZoom((value) => Math.max(MIN_ZOOM, +(value - 0.25).toFixed(2)))}><Minus className="h-4 w-4" /></Button>
          <span className="w-11 text-center text-xs tabular-nums">{Math.round(zoom * 100)}%</span>
          <Button variant="outline" size="icon" aria-label="Aumentar zoom" disabled={zoom >= MAX_ZOOM} onClick={() => setZoom((value) => Math.min(MAX_ZOOM, +(value + 0.25).toFixed(2)))}><Plus className="h-4 w-4" /></Button>
        </div>
        <Button variant="outline" size="sm" aria-label="Abrir PDF em nova aba" disabled={openingTab} onClick={openInNewTab}><ExternalLink className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" aria-label="Fechar visualizador" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>
      <div ref={pageArea} role="region" aria-label="Páginas do PDF" tabIndex={0} className="min-h-0 flex-1 overflow-auto bg-slate-100 p-4">
        {error ? <div role="alert" className="rounded-lg border bg-white p-4 text-sm text-destructive"><p>{error}</p><Button variant="outline" size="sm" className="mt-3" onClick={retry}>Tentar novamente</Button></div> : !pdf ? <div role="status" className="rounded-lg border bg-white p-4 text-sm text-muted-foreground">Carregando PDF...</div> : (
          <div className="flex flex-col gap-6">
            {Array.from({ length: pdf.numPages }, (_, index) => (
              <PdfPage key={index + 1} pdf={pdf} number={index + 1} zoom={zoom} availableWidth={availableWidth} estimatedAspect={estimatedAspect} scrollRoot={pageArea} onError={showPageError} />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
