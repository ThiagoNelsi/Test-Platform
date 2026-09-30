import { Input } from "@/src/components/ui/input"
import { Badge } from "@/src/components/ui/badge"
import { Checkbox } from "@/src/components/ui/checkbox"
import { ScrollArea } from "@/src/components/ui/scroll-area"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog"
import { Button } from "@/src/components/ui/button"
import { Search } from "lucide-react"
import { JSX } from "react"
import type { Resource } from "@/lib/types"

type ResourceSelectorDialogProps = {
  showResourceSelector: boolean
  setShowResourceSelector: (show: boolean) => void
  selectedResources: number[]
  setSelectedResources: (resources: number[]) => void
  toggleResourceSelection: (id: number) => void
  getResourceIcon: (fileType: string) => JSX.Element
  resources: Resource[] | null
}

export default function ResourceSelectorDialog({
  showResourceSelector,
  setShowResourceSelector,
  selectedResources,
  toggleResourceSelection,
  getResourceIcon,
  resources
}: ResourceSelectorDialogProps) {
  return (
    <Dialog open={showResourceSelector} onOpenChange={setShowResourceSelector}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Selecionar Materiais</DialogTitle>
          <DialogDescription>
            Escolha os materiais que servirão como referência para a geração de questões.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="relative mb-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Buscar materiais..." className="pl-9" />
          </div>

          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {resources?.map((resource) => (
                <div
                  key={resource.id}
                  className={`flex items-start gap-3 p-3 border rounded-md cursor-pointer transition-colors ${
                    selectedResources.includes(resource.id)
                      ? "border-primary bg-primary/5"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                  onClick={() => toggleResourceSelection(resource.id)}
                >
                  <Checkbox checked={selectedResources.includes(resource.id)} className="mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      {getResourceIcon(resource.fileType)}
                      <div>
                        <p className="font-medium text-sm">{resource.filename}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(resource.createdAt).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                    {resource.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {resource.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setShowResourceSelector(false)}>
            Cancelar
          </Button>
          <Button onClick={() => setShowResourceSelector(false)}>Confirmar Seleção</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
