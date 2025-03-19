import TestList from "@/app/components/test-list";
import { Button } from "@/app/components/ui/button";
import Link from "next/link";
import { MdAdd } from "react-icons/md";
import { getOwnedTests } from "@/lib/test-service";

export default async function Tests() {
  const tests = await getOwnedTests();

  if (!tests) return <div>Erro ao carregar provas</div>;

  const publishedTests = tests.filter((test) => test.status === "published");
  const scheduledTests = tests.filter((test) => test.status === "scheduled");
  const draftTests = tests.filter((test) => test.status === "draft");

  return (
    <div className="max-w-[100ch] mx-auto">
      <div className="flex flex-col gap-6 pb-64">
        <menu className="flex items-center justify-end">
          <Button variant="outline">
            <Link href="/create-test" className="flex items-center gap-2">
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
      </div>
    </div>
  );
}

