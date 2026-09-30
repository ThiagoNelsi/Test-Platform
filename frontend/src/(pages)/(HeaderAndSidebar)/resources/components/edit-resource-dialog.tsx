import { useId, useState } from "react";
import { Plus, Tag, X } from "lucide-react";
import type { Resource } from "@/lib/types";
import { getApiErrorMessage } from "@/lib/backend-api";
import { errorToast, successToast } from "@/lib/toasters";
import { useUpdateResourceMutation } from "@/src/hooks/use-api-queries";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Badge } from "@/src/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/src/components/ui/dialog";

export default function EditResourceDialog({ resource, onClose }: { resource: Resource; onClose: () => void }) {
  const id = useId();
  const extensionIndex = resource.filename.lastIndexOf(".");
  const extension = extensionIndex > 0 ? resource.filename.slice(extensionIndex) : "";
  const [name, setName] = useState(extension ? resource.filename.slice(0, extensionIndex) : resource.filename);
  const [tags, setTags] = useState(resource.tags);
  const [currentTag, setCurrentTag] = useState("");
  const [validation, setValidation] = useState("");
  const mutation = useUpdateResourceMutation();

  function addTag() {
    const tag = currentTag.trim();
    if (!tag) return;
    if (tag.length > 50 || (!tags.includes(tag) && tags.length >= 30)) {
      setValidation("Use até 30 tags de no máximo 50 caracteres."); return;
    }
    if (!tags.includes(tag)) setTags([...tags, tag]);
    setCurrentTag("");
    setValidation("");
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const filename = name.trim() + extension;
    const pendingTag = currentTag.trim();
    const nextTags = [...new Set([...tags, ...(pendingTag ? [pendingTag] : [])])];
    const hasControlCharacters = [...filename].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127);
    if (!name.trim() || filename.length > 255 || filename.includes("/") || filename.includes("\\") || hasControlCharacters) {
      setValidation("Informe um nome válido de até 255 caracteres, sem barras."); return;
    }
    if (nextTags.length > 30 || nextTags.some((tag) => tag.length > 50)) {
      setValidation("Use até 30 tags de no máximo 50 caracteres."); return;
    }
    try {
      await mutation.mutateAsync({ id: resource.id, data: { filename, tags: nextTags } });
      successToast("Material atualizado.");
      onClose();
    } catch (error) {
      errorToast(getApiErrorMessage(error, "Não foi possível atualizar o material."));
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !mutation.isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar material</DialogTitle>
          <DialogDescription>Renomeie o material e edite as tags para facilitar a organização.</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <fieldset disabled={mutation.isPending} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor={`${id}-name`}>Nome do arquivo</Label>
              <div className="flex gap-1">
                <Input id={`${id}-name`} value={name} onChange={(event) => setName(event.target.value)} autoFocus maxLength={255 - extension.length} className="flex-1" />
                {extension && <div className="flex items-center rounded-md border bg-muted px-3 text-sm text-muted-foreground">{extension}</div>}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${id}-tags`}>Tags</Label>
              <div className="flex gap-2">
                <Input id={`${id}-tags`} value={currentTag} onChange={(event) => setCurrentTag(event.target.value)} placeholder="Adicionar tag..." maxLength={50} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addTag(); } }} />
                <Button type="button" variant="secondary" onClick={addTag} disabled={!currentTag.trim()} aria-label="Adicionar tag"><Plus className="h-4 w-4" /></Button>
              </div>
              {tags.length ? <div className="flex flex-wrap gap-2 pt-1">{tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1 pl-2 max-w-full">
                  <Tag className="h-3 w-3 shrink-0" /><span className="break-all">{tag}</span>
                  <button type="button" onClick={() => setTags(tags.filter((item) => item !== tag))} className="ml-1 rounded-full p-0.5 hover:bg-muted" aria-label={`Remover tag ${tag}`}><X className="h-3 w-3" /></button>
                </Badge>
              ))}</div> : <p className="text-xs text-muted-foreground">Nenhuma tag adicionada.</p>}
            </div>
          </fieldset>
          {validation && <p role="alert" className="text-sm text-destructive">{validation}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Salvando..." : "Salvar alterações"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
