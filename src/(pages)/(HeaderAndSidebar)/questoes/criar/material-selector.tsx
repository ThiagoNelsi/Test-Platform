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
import { Material } from "./create-with-ai"

type MaterialSelectorDialogProps = {
  showMaterialSelector: boolean
  setShowMaterialSelector: (show: boolean) => void
  selectedMaterials: number[]
  setSelectedMaterials: (materials: number[]) => void
  toggleMaterialSelection: (id: number) => void
  getMaterialIcon: (fileType: string) => JSX.Element
  materials: Material[] | null
}

export default function MaterialSelectorDialog({
  showMaterialSelector,
  setShowMaterialSelector,
  selectedMaterials,
  toggleMaterialSelection,
  getMaterialIcon,
  materials
}: MaterialSelectorDialogProps) {
  return (
    <Dialog open={showMaterialSelector} onOpenChange={setShowMaterialSelector}>
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
              {materials?.map((material) => (
                <div
                  key={material.id}
                  className={`flex items-start gap-3 p-3 border rounded-md cursor-pointer transition-colors ${
                    selectedMaterials.includes(material.id)
                      ? "border-primary bg-primary/5"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                  onClick={() => toggleMaterialSelection(material.id)}
                >
                  <Checkbox checked={selectedMaterials.includes(material.id)} className="mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      {getMaterialIcon(material.fileType)}
                      <div>
                        <p className="font-medium text-sm">{material.filename}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(material.createdAt).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                    {material.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {material.tags.map((tag) => (
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
          <Button variant="outline" onClick={() => setShowMaterialSelector(false)}>
            Cancelar
          </Button>
          <Button onClick={() => setShowMaterialSelector(false)}>Confirmar Seleção</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
