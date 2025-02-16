import { getQuestions } from "@/lib/questionService";
import { getUserId } from "@/lib/auth";
import { columns, QuestionData } from "./columns";
import { DataTable } from "@/app/components/ui/data-table";
import TableActions from "./table-actions";
import { TableProvider } from "@/app/context/table-context";
import { QuestionEditorProvider } from "@/app/context/question-editor-context";

export default async function Page() {
    const userId = await getUserId();
    if (!userId) return null;

    const questions: QuestionData[] = await getQuestions(userId)

    const formattedQuestions = questions.map((question) => {
        return {
            ...question,
            data: question.data,
            type: question.type,
            level: question.level,
            tags: question.tags,
            createdAt: question.createdAt,
        }
    })

    return (
        <QuestionEditorProvider>
            <TableProvider>
                <div className="container mx-auto py-10">
                    <TableActions />
                    <DataTable columns={columns} data={formattedQuestions} />
                </div>
            </TableProvider>
        </QuestionEditorProvider>
    );
}