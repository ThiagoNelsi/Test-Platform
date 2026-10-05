import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import type { Resource } from "@/lib/types";
import { Button } from "@/src/components/ui/button";
import { Plus, Trash } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs";
import { AppLink as Link } from "@/src/components/router-helpers";
import ResourceCard from "./components/resource-card";
import { useResourcesController } from "@/src/controllers/resources-controller";
import { QueryError, QueryLoading } from "@/src/components/query-state";

const PdfSidePanel = lazy(() => import("./components/pdf-side-panel"));
const MIN_PANEL_WIDTH = 320;
const MIN_LIST_WIDTH = 280;

export default function Page() {
  const [view, setView] = useState("library");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [panelWidth, setPanelWidth] = useState(520);
  const [rightGap, setRightGap] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(68);
  const workspace = useRef<HTMLDivElement>(null);
  const deleted = view === "trash";
  const { resources, loading, error, refetch } = useResourcesController(deleted);
  const selected = resources.find((resource) => resource.id === selectedId && resource.fileType === "application/pdf" && !resource.deletedAt);
  const panelOpen = !!selected && !deleted;
  const maxPanelWidth = () => Math.max(MIN_PANEL_WIDTH, Math.min(window.innerWidth * 0.75, window.innerWidth - (workspace.current?.getBoundingClientRect().left ?? 0) - MIN_LIST_WIDTH));
  const dimensions = {
    "--panel-width": `${panelWidth}px`,
    "--header-height": `${headerHeight}px`,
    "--list-width": `calc(100% - ${Math.max(0, panelWidth - rightGap + 12)}px)`,
  } as CSSProperties;

  useEffect(() => {
    if (!workspace.current) return;
    const update = () => {
      if (workspace.current) setRightGap(window.innerWidth - workspace.current.getBoundingClientRect().right);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(workspace.current);
    window.addEventListener("resize", update);
    return () => { observer.disconnect(); window.removeEventListener("resize", update); };
  }, []);

  useEffect(() => {
    const header = document.querySelector<HTMLElement>("#main-content header");
    if (!header) return;
    const update = () => setHeaderHeight(header.getBoundingClientRect().height);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  function resizePanel(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  function moveResize(event: PointerEvent<HTMLDivElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    setPanelWidth(Math.min(maxPanelWidth(), Math.max(MIN_PANEL_WIDTH, window.innerWidth - event.clientX)));
  }

  function finishResize(event: PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }

  function resizeWithKeyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    setPanelWidth((width) => Math.min(maxPanelWidth(), Math.max(MIN_PANEL_WIDTH, width + (event.key === "ArrowLeft" ? 32 : -32))));
  }

  function openPdf(resource: Resource) {
    setSelectedId(resource.id);
  }

  return (
    <div>
      <h1>Meus Materiais</h1>
      <Button asChild className="mb-4 mt-4 bg-blue-500 hover:bg-blue-600 text-white">
        <Link to="/materiais/upload" className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Adicionar Material
        </Link>
      </Button>
      <Tabs value={view} onValueChange={(next) => { setView(next); setSelectedId(null); }} className="mb-4">
        <TabsList>
          <TabsTrigger value="library">Meus materiais</TabsTrigger>
          <TabsTrigger value="trash" className="gap-2"><Trash className="h-4 w-4" />Lixeira</TabsTrigger>
        </TabsList>
        <TabsContent value={view}>
          {deleted && <p className="mb-4 text-sm text-muted-foreground">Materiais na lixeira não ficam disponíveis para gerar questões. Restaure-os para voltar a usá-los.</p>}
          <div ref={workspace} className="w-full" style={panelOpen ? dimensions : undefined}>
            <div className={panelOpen ? "w-full lg:w-[var(--list-width)]" : "w-full"}>
              {loading ? <QueryLoading message="Carregando materiais..." /> : error ? <QueryError message="Erro ao buscar materiais." onRetry={refetch} /> : resources.length === 0 ? (
                <p className="rounded border border-dashed p-8 text-center text-sm text-muted-foreground">
                  {deleted ? "Sua lixeira está vazia." : "Nenhum material encontrado."}
                </p>
              ) : (
                <div className={`grid grid-cols-1 gap-4 ${panelOpen ? "" : "md:grid-cols-2"}`}>
                  {resources.map((resource) => (
                    <ResourceCard key={resource.id} resource={resource} onOpenPdf={openPdf} />
                  ))}
                </div>
              )}
            </div>
            {panelOpen && <>
              <div
                role="separator"
                aria-label="Redimensionar visualizador de PDF"
                aria-orientation="vertical"
                aria-valuemin={MIN_PANEL_WIDTH}
                aria-valuemax={Math.round(maxPanelWidth())}
                aria-valuenow={panelWidth}
                tabIndex={0}
                onPointerDown={resizePanel}
                onPointerMove={moveResize}
                onPointerUp={finishResize}
                onPointerCancel={finishResize}
                onKeyDown={resizeWithKeyboard}
                className="group fixed bottom-0 z-50 hidden w-2 cursor-col-resize touch-none items-center justify-center outline-none lg:flex"
                style={{ right: `var(--panel-width)`, top: `var(--header-height)` }}
              >
                <span className="h-16 w-1 rounded-full bg-gray-300 transition-colors group-hover:bg-blue-500 group-focus-visible:bg-blue-500" />
              </div>
              <div className="fixed bottom-0 right-0 z-40 w-full lg:w-[var(--panel-width)]" style={{ top: `var(--header-height)` }}>
                <Suspense fallback={<div className="h-full border-l bg-white p-6 text-sm text-muted-foreground">Carregando visualizador...</div>}>
                  <PdfSidePanel key={selected.id} resource={selected} onClose={() => setSelectedId(null)} />
                </Suspense>
              </div>
            </>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
