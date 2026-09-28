
import { Button } from "@/src/components/ui/button";
import { Plus, Trash } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs";
import { AppLink as Link } from "@/src/components/router-helpers";
import ResourceCard from "./components/resource-card";
import { useMaterialsController } from "@/src/controllers/materials-controller";
import { QueryError, QueryLoading } from "@/src/components/query-state";

export default function Page() {
  const [view, setView] = useState("library");
  const deleted = view === "trash";
  const { resources, loading, error, refetch } = useMaterialsController(deleted);

  return (
    <div>
      <h1>Meus Materiais</h1>
      <Button asChild className="mb-4 mt-4 bg-blue-500 hover:bg-blue-600 text-white">
        <Link to="/materiais/upload" className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Adicionar Material
        </Link>
      </Button>
      <Tabs value={view} onValueChange={setView} className="mb-4">
        <TabsList>
          <TabsTrigger value="library">Meus materiais</TabsTrigger>
          <TabsTrigger value="trash" className="gap-2"><Trash className="h-4 w-4" />Lixeira</TabsTrigger>
        </TabsList>
      <TabsContent value={view}>
      {deleted && <p className="mb-4 text-sm text-muted-foreground">Materiais na lixeira não ficam disponíveis para gerar questões. Restaure-os para voltar a usá-los.</p>}
      {loading ? <QueryLoading message="Carregando materiais..." /> : error ? <QueryError message="Erro ao buscar materiais." onRetry={refetch} /> : resources.length === 0 ? (
        <p className="rounded border border-dashed p-8 text-center text-sm text-muted-foreground">
          {deleted ? "Sua lixeira está vazia." : "Nenhum material encontrado."}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resources.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      )}
      </TabsContent>
      </Tabs>
    </div>
  );
}
