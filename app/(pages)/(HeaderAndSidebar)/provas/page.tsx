"use client"

import TestList from "@/app/components/test-list";
import { Button } from "@/app/components/ui/button";
import { useTestListController } from "@/app/controllers/test-list-controller";
import Link from "next/link";
import { MdAdd } from "react-icons/md";

export default function Tests() {
  const { draftTests, scheduledTests, publishedTests } = useTestListController();

  console.log({ draftTests, scheduledTests, publishedTests });

  return (
    <div className="max-w-[100ch] mx-auto">
      <div className="flex flex-col gap-6 pb-64">
        <menu className="flex items-center justify-end">
          <Button variant="outline">
            <Link href="/provas/criar" className="flex items-center gap-2">
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

