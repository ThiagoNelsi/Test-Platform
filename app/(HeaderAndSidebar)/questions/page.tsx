import { getQuestions } from "@/lib/question-service";
import { getUserId } from "@/lib/auth";
import { columns } from "./columns";
import { DataTable } from "@/app/components/ui/data-table";
import TableActions from "./table-actions";
import { TableProvider } from "@/app/context/table-context";
import { QuestionEditorProvider } from "@/app/context/question-editor-context";

export default async function Page() {
  const userId = await getUserId();
  if (!userId) return null;

  const res = await getQuestions();

  return (
    <QuestionEditorProvider>
      <TableProvider>
        <div className="container mx-auto">
          <TableActions />
          <DataTable columns={columns} data={res} />
        </div>
      </TableProvider>
    </QuestionEditorProvider>
  );
}
