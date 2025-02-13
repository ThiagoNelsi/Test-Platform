import { getQuestions } from "@/lib/questionService";
import { getUserId } from "@/lib/auth";
import { columns, QuestionData } from "./columns";
import { DataTable } from "@/app/components/ui/data-table";
import TableActions from "./table-actions";
import { TableProvider } from "@/app/context/TableContext";
import { QuestionEditorProvider } from "@/app/context/QuestionEditorContext";
import { Tag } from "@/app/types";

export default async function Page() {
    const userId = await getUserId();
    if (!userId) return null;

    const questions: QuestionData[] = await getQuestions(userId)

    const tags: Tag[][] = [
        [{ id: 1, userId: 1, name: "Matemática", color: "#FF5733" }, { id: 2, userId: 1, name: "Português", color: "#33FF57" }, { id: 3, userId: 1, name: "História", color: "#3357FF" }, { id: 4, userId: 1, name: "Geografia", color: "#FF33A1" }, { id: 5, userId: 1, name: "Ciências", color: "#A133FF" }, { id: 6, userId: 1, name: "Inglês", color: "#33FFA1" }],
        [{ id: 2, userId: 1, name: "Português", color: "#33FF57" }, { id: 3, userId: 1, name: "História", color: "#3357FF" }, { id: 4, userId: 1, name: "Geografia", color: "#FF33A1" }, { id: 5, userId: 1, name: "Ciências", color: "#A133FF" }, { id: 6, userId: 1, name: "Inglês", color: "#33FFA1" }],
        [{ id: 3, userId: 1, name: "História", color: "#3357FF" }, { id: 4, userId: 1, name: "Geografia", color: "#FF33A1" }, { id: 5, userId: 1, name: "Ciências", color: "#A133FF" }, { id: 6, userId: 1, name: "Inglês", color: "#33FFA1" }],
        [{ id: 4, userId: 1, name: "Geografia", color: "#FF33A1" }, { id: 5, userId: 1, name: "Ciências", color: "#A133FF" }, { id: 6, userId: 1, name: "Inglês", color: "#33FFA1" }],
        [{ id: 5, userId: 1, name: "Ciências", color: "#A133FF" }, { id: 6, userId: 1, name: "Inglês", color: "#33FFA1" }],
        [{ id: 6, userId: 1, name: "Inglês", color: "#33FFA1" }],
    ];

    const formattedQuestions = questions.map((question, index) => {
        return {
            ...question,
            data: question.data,
            type: question.type,
            level: question.level,
            tags: tags[index],
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