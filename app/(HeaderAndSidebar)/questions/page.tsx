"use client"

import { getQuestions } from "@/lib/question-service";
import { columns } from "./columns";
import { DataTable } from "@/app/components/ui/data-table";
import TableActions from "./table-actions";
import { TableProvider } from "@/app/context/table-context";
import { QuestionEditorProvider } from "@/app/context/question-editor-context";
import { PossibleQuestionTypes, QuestionFactory } from "@/lib/question";
import { useEffect, useState } from "react";
import { errorToast } from "@/lib/toasters";

export default function Page() {
  const [questions, setQuestions] = useState<PossibleQuestionTypes[]>([]);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const res = await getQuestions();
      setQuestions(QuestionFactory.from(res));
    }

    setFetching(true);
    fetchData()
      .then(() => setFetching(false))
      .catch((error) => {
        errorToast("Erro ao carregar questões");
        setFetching(false)
      });
  }, []);

  if (!questions) return null;

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Carregando questões...</p>
      </div>
    );
  }

  return (
    <QuestionEditorProvider>
      <TableProvider>
        <div className="container mx-auto">
          <TableActions />
          <DataTable columns={columns} data={questions} />
        </div>
      </TableProvider>
    </QuestionEditorProvider>
  );
}
