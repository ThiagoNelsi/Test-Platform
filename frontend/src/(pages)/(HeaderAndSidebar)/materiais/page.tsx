
import { Button } from "@/src/components/ui/button";
import { Plus } from "lucide-react";
import { AppLink as Link } from "@/src/components/router-helpers";
import ResourceCard from "./components/resource-card";
import { useMaterialsController } from "@/src/controllers/materials-controller";
import { QueryError, QueryLoading } from "@/src/components/query-state";

export default function Page() {
  const { resources, loading, error, refetch } = useMaterialsController();

  if (loading) {
    return <QueryLoading message="Carregando materiais..." />;
  }

  if (error) {
    return <QueryError message="Erro ao buscar materiais." onRetry={refetch} />;
  }

  return (
    <div>
      <h1>Meus Materiais</h1>
      <Button className="mb-4 mt-4 bg-blue-500 hover:bg-blue-600 text-white">
        <Link to="/materiais/upload" className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Adicionar Material
        </Link>
      </Button>
      {resources.length === 0 ? (
        <p className="rounded border border-dashed p-8 text-center text-sm text-muted-foreground">
          Nenhum material encontrado.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resources.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      )}
    </div>
  );
}
