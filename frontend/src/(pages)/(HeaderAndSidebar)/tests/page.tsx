
import TestList from "@/src/components/test-list";
import { Button } from "@/src/components/ui/button";
import { useTestListController } from "@/src/controllers/test-list-controller";
import { AppLink as Link } from "@/src/components/router-helpers";
import { MdAdd } from "react-icons/md";
import { QueryError, QueryLoading } from "@/src/components/query-state";

export default function Tests() {
  const {
    draftTests,
    scheduledTests,
    publishedTests,
    loading,
    error,
    refetch,
  } = useTestListController();

  if (loading) {
    return <QueryLoading message="Carregando provas..." />;
  }

  if (error) {
    return <QueryError message="Erro ao buscar as provas." onRetry={refetch} />;
  }

  return (
    <div className="max-w-[100ch] mx-auto">
      <div className="flex flex-col gap-6 pb-64">
        <menu className="flex items-center justify-end">
          <Button variant="outline">
            <Link to="/provas/criar" className="flex items-center gap-2">
              <MdAdd /> Criar prova
            </Link>
          </Button>
        </menu>
        {draftTests.length > 0 && (
          <TestList tests={draftTests} title="Rascunhos" />
        )}
        {scheduledTests.length > 0 && (
          <TestList tests={scheduledTests} title="Agendadas" />
        )}
        {publishedTests.length > 0 && (
          <TestList tests={publishedTests} title="Publicadas" defaultOpen />
        )}
        {draftTests.length === 0 &&
          scheduledTests.length === 0 &&
          publishedTests.length === 0 && (
            <p className="rounded border border-dashed p-8 text-center text-sm text-muted-foreground">
              Nenhuma prova encontrada.
            </p>
          )}
      </div>
    </div>
  );
}
