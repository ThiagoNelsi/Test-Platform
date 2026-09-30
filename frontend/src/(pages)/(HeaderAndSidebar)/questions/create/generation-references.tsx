import type { QuestionGenerationReference } from "api-contracts"
import { ChevronDown, FileText, Loader2 } from "lucide-react"
import { Badge } from "@/src/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/src/components/ui/collapsible"
import type { Resource } from "@/lib/types"

type GenerationReferencesProps = {
  references: QuestionGenerationReference[] | null
  resources: Resource[]
  isGenerating: boolean
}

export default function GenerationReferences({ references, resources, isGenerating }: GenerationReferencesProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Trechos de referência
          </CardTitle>
          {references && references.length > 0 && (
            <Badge variant="secondary">
              {references.length} {references.length === 1 ? "trecho" : "trechos"}
            </Badge>
          )}
        </div>
        <CardDescription>Conteúdo dos materiais recuperado para orientar a geração das questões.</CardDescription>
      </CardHeader>
      <CardContent>
        {references === null ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
            {isGenerating && <Loader2 className="h-4 w-4 animate-spin" />}
            {isGenerating ? "Buscando trechos nos materiais selecionados..." : "Não foi possível recuperar os trechos de referência."}
          </div>
        ) : references.length === 0 ? (
          <p className="text-sm text-muted-foreground" role="status">Nenhum trecho encontrado nos materiais selecionados.</p>
        ) : (
          <div className="max-h-[480px] space-y-4 overflow-y-auto pr-2">
            {references.map((reference, index) => {
              const preview = reference.content.replace(/\s+/g, " ").trim()

              return (
                <Collapsible key={index} className="group space-y-3 rounded-lg border p-4">
                  <div className="space-y-2">
                    <CollapsibleTrigger className="flex w-full items-start justify-between gap-3 rounded-sm text-left text-sm font-medium hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                      <span className="break-words">{reference.title || "Seção sem título"}</span>
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                      <span className="sr-only">Expandir ou recolher trecho de referência</span>
                    </CollapsibleTrigger>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="break-all">
                        {resources.find((resource) => resource.objectKey === reference.document)?.filename ?? reference.document}
                      </span>
                      <Badge variant="outline">
                        {reference.pages.length > 0
                          ? `${reference.pages.length === 1 ? "Página" : "Páginas"} ${reference.pages.join(", ")}`
                          : "Página não informada"}
                      </Badge>
                    </div>
                  </div>
                  <p className="break-words text-sm leading-relaxed text-muted-foreground group-data-[state=open]:hidden">
                    {preview.length > 180 ? `${preview.slice(0, 180).trimEnd()}…` : preview}
                  </p>
                  <CollapsibleContent>
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{reference.content}</p>
                  </CollapsibleContent>
                </Collapsible>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
