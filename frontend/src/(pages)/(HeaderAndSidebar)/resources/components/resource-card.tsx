import { useState } from "react";
import type { Resource, ResourceStatus } from "@/lib/types";
import { Button } from "@/src/components/ui/button";
import { Download, Pencil, RotateCcw, Sparkles, Trash } from "lucide-react";
import Confirm from "@/src/components/ui/confirm";
import { AppLink as Link } from "@/src/components/router-helpers";
import { useDeleteResourceMutation, useRestoreResourceMutation } from "@/src/hooks/use-api-queries";
import { getResourceFile } from "@/lib/resource-service";
import { getApiErrorMessage } from "@/lib/backend-api";
import { errorToast, successToast } from "@/lib/toasters";
import EditResourceDialog from "./edit-resource-dialog";
import ResourcePreview from "./resource-preview";

const statuses: Record<ResourceStatus, string> = {
  PENDING_UPLOAD: "Aguardando upload", UPLOADED: "Enviado", PROCESSING: "Processando...",
  PROCESSED: "Pronto para usar", FAILED: "Erro", EXPIRED: "Expirado",
};
const badgeStyles: Record<ResourceStatus, string> = {
  PENDING_UPLOAD: "bg-amber-100 text-amber-800", UPLOADED: "bg-blue-100 text-blue-800",
  PROCESSING: "bg-yellow-100 text-yellow-800", PROCESSED: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800", EXPIRED: "bg-gray-100 text-gray-800",
};

export default function ResourceCard({ resource, onOpenPdf }: { resource: Resource; onOpenPdf: (resource: Resource) => void }) {
  const [editing, setEditing] = useState(false);
  const [fileAction, setFileAction] = useState<"open" | "download" | null>(null);
  const deletion = useDeleteResourceMutation();
  const restoration = useRestoreResourceMutation();
  const deleted = !!resource.deletedAt;
  const busy = deletion.isPending || restoration.isPending || fileAction !== null;
  const fileAvailable = resource.status !== "PENDING_UPLOAD" && resource.status !== "EXPIRED";

  async function remove() {
    try {
      await deletion.mutateAsync(resource.id);
      successToast("Material movido para a lixeira.");
    } catch (error) { errorToast(getApiErrorMessage(error, "Não foi possível excluir o material.")); }
  }
  async function restore() {
    try {
      await restoration.mutateAsync(resource.id);
      successToast("Material restaurado.");
    } catch (error) { errorToast(getApiErrorMessage(error, "Não foi possível restaurar o material.")); }
  }
  async function accessFile(download: boolean) {
    if (!download && resource.fileType === "application/pdf") {
      onOpenPdf(resource);
      return;
    }
    // Open synchronously so the browser does not block the new tab after the request.
    const preview = download ? null : window.open("about:blank", "_blank");
    if (!download && !preview) { errorToast("Permita abrir uma nova aba para visualizar o material."); return; }
    if (preview) preview.opener = null;
    setFileAction(download ? "download" : "open");
    try {
      const { url } = await getResourceFile(resource.id, download);
      if (preview) preview.location.replace(url);
      else {
        const link = document.createElement("a");
        link.href = url;
        link.download = resource.filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (error) {
      preview?.close();
      errorToast(getApiErrorMessage(error, "Não foi possível acessar o arquivo."));
    } finally { setFileAction(null); }
  }

  return (
    <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-md">
      <ResourcePreview resource={resource} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="min-w-0 truncate text-sm font-semibold" title={resource.filename}>
            {deleted ? resource.filename : (
              <button type="button" disabled={busy || !fileAvailable} onClick={() => accessFile(false)} aria-label={`Abrir ${resource.filename}`} className="block max-w-full truncate text-left hover:text-blue-600 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-default disabled:hover:text-inherit disabled:hover:no-underline">
                {resource.filename}
              </button>
            )}
          </h2>
          {!deleted && resource.status !== "PROCESSED" && <span className={`rounded-full px-3 py-1 text-center text-xs font-medium ${badgeStyles[resource.status]}`}>{statuses[resource.status]}</span>}
        </div>
        <div className="flex flex-wrap gap-2">{resource.tags.map((tag) => <span key={tag} className="max-w-full break-all rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">{tag}</span>)}</div>
        {deleted && <p className="text-xs text-muted-foreground">Excluído em {resource.deletedAt!.toLocaleDateString("pt-BR")}</p>}
        <div className="flex flex-wrap items-center gap-2">
          {deleted ? (
            <Button variant="outline" className="gap-2 text-xs" disabled={busy} onClick={restore}><RotateCcw className="h-4 w-4" />{restoration.isPending ? "Restaurando..." : "Restaurar"}</Button>
          ) : (<>
            <Button variant="outline" className="gap-2 text-xs" disabled={busy || !fileAvailable} onClick={() => accessFile(true)}><Download className="h-4 w-4" />{fileAction === "download" ? "Preparando..." : "Baixar"}</Button>
            <Button variant="outline" className="gap-2 text-xs" disabled={busy} onClick={() => setEditing(true)}><Pencil className="h-4 w-4" />Editar</Button>
            {resource.status === "PROCESSED" ? (
              <Button variant="outline" className="text-xs" asChild><Link to={`/questoes/criar?tab=ai&resourceId=${resource.id}`} className="flex items-center gap-2"><Sparkles className="h-4 w-4" />Gerar questões</Link></Button>
            ) : <Button variant="outline" className="gap-2 text-xs" disabled><Sparkles className="h-4 w-4" />Gerar questões</Button>}
            <Confirm title="Excluir material" description={`Mover "${resource.filename}" para a lixeira? Você poderá restaurá-lo depois. As questões já criadas serão preservadas.`} onConfirm={remove} confirmText="Mover para lixeira" confirmBtnStyle="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              <Button variant="ghost" className="text-xs text-destructive hover:text-destructive" disabled={busy} aria-label={`Excluir ${resource.filename}`}><Trash className="h-4 w-4" /></Button>
            </Confirm>
          </>)}
        </div>
      </div>
      {editing && <EditResourceDialog resource={resource} onClose={() => setEditing(false)} />}
    </div>
  );
}
