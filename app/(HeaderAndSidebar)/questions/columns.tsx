"use client"

import { ColumnDef, Table } from "@tanstack/react-table"
import { QuestionType } from "@/app/types"
import { Checkbox } from "@/app/components/ui/checkbox"
import { Button } from "@/app/components/ui/button"
import { ArrowUpDown, Edit, Trash } from "lucide-react"
import Confirm, { ConfirmTrigger } from "@/app/components/ui/confirm"
import { deleteQuestion } from "@/lib/questionService"
import { useTable } from "@/app/context/TableContext"

export type QuestionData = {
    id: number,
    createdAt: Date,
    type: QuestionType,
    level: number | null,
    tags: string[],
    data: any
}

const questionTypeTranslations: { [key in QuestionType]: string } = {
    multiple_choice: "Múltipla escolha",
    true_or_false: "Verdadeiro ou falso"
}

export const columns: ColumnDef<QuestionData>[] = [
    {
        id: "select",
        header: ({ table }) => (
            <Checkbox
                checked={
                    table.getIsAllPageRowsSelected() ||
                    (table.getIsSomePageRowsSelected() && "indeterminate")
                }
                onCheckedChange={(value: boolean) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="Select all"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value: boolean) => row.toggleSelected(!!value)}
                aria-label="Select row"
                className="mr-4"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: "data",
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
                Questão
                <ArrowUpDown />
            </Button>
        ),
        cell: ({ row }) => {
            const statementText = row.original.data.statement
                ?.map((s: any) => (s.type === "text" ? s.value : ""))
                .filter(Boolean)
                .join(" ")
                .slice(0, 300) + "...";
            return statementText
        },
    },
    {
        header: "Tipo",
        accessorKey: "type",
        cell: ({ row }) => {
            return questionTypeTranslations[row.original.type]
        }
    },
    {
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
                Nível
                <ArrowUpDown />
            </Button>
        ),
        accessorKey: "level",
        cell: ({ row }) => {
            return ["-", "Fácil", "Médio", "Difícil"][(row.original.level ?? -1) + 1]
        }
    },
    {
        header: "Tags",
        accessorKey: "tags"
    },
    {
        header: "Ações",
        accessorKey: "actions",
        cell: ({ row }) => {
            const { rowSelection, setRowSelection } = useTable()
            const handleDelete = async () => {
                const res = await deleteQuestion([row.original.id]);
                if (res) {
                    if (rowSelection[row.id]) {
                        const newSelection = { ...rowSelection }
                        delete newSelection[row.id]
                        setRowSelection(newSelection)
                    }
                }
            }

            return (
                <div>
                    <Button className="hover:bg-verdigris" variant="ghost" size="sm" onClick={() => console.log(`Edit question ${row.original.id}`)}>
                        <Edit /> Editar
                    </Button>
                    <Confirm
                        title={`Tem certeza que deseja apagar a questão?`}
                        description="Esta ação é irreversível."
                        confirmText="Apagar"
                        onConfirm={handleDelete}
                        confirmBtnStyle="bg-red-500 text-white hover:bg-red-600"
                    >
                        <ConfirmTrigger>
                            <Button
                                className="hover:bg-red-400"
                                variant="ghost"
                                size="sm"
                            >
                                <Trash /> Deletar
                            </Button>
                        </ConfirmTrigger>
                    </Confirm>
                </div>
            )
        }
    }
]