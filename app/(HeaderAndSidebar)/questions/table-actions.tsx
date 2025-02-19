"use client"

import { Button } from "@/app/components/ui/button";
import { Trash } from "lucide-react";
import { MdAdd } from "react-icons/md";
import { useTable } from "@/app/context/table-context";
import Confirm, { ConfirmTrigger } from "@/app/components/ui/confirm";
import { deleteQuestion } from "@/lib/questionService";
import QuestionDialogTrigger from './question-dialog-trigger'
import { Input } from "@/app/components/ui/input";
import { useEffect, useState } from "react";
import { Tag } from "@/lib/types";
import { RemovableTag } from "@/app/components/removable-tag";
import { SearchTags } from "@/app/components/search-tags";

export default function TableActions() {
    const { table, rowSelection, setRowSelection, filter, setFilter, removeTagFilter, addTagFilter } = useTable();
    const [tags, setTags] = useState<Tag[]>([]);
    const selectedRowsCount = Object.keys(rowSelection).length;
    const selectedTags = filter?.tags;

    useEffect(() => {
        if (table) {
            const tags = table.getRowModel().rows.map((row) => {
                const question = row.original as { tags: Tag[] }
                return question.tags
            }).flat()
            const uniqueTags: Tag[] = []
            tags.forEach((tag) => {
                if (!uniqueTags.some((t) => t.id === tag.id)) {
                    uniqueTags.push(tag)
                }
            })
            setTags(uniqueTags)
        }
    }, [table])

    const getSelectedQuestionIds = () => {
        const tableRows = table?.getRowModel().rows
        const rows = tableRows?.filter((row) => rowSelection[row.id])
        return rows?.map((row) => (row.original as { id: number }).id)
    }

    const handleDeleteQuestion = async (questionIds: number[]) => {
        if (questionIds.length === 0) return;

        const res = await deleteQuestion(questionIds);
        if (res) {
            setRowSelection({});
        }
    }

    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFilter({
            text: event.target.value,
            tags: filter?.tags ?? []
        })
    }

    return (
        <menu className="flex items-center gap-4 justify-between mb-4">
            <QuestionDialogTrigger type="create" initialData={null}>
                <Button className="bg-ash_gray-300 text-white hover:bg-ash_gray-200">
                    <MdAdd /> Criar questão
                </Button>
            </QuestionDialogTrigger>
            <div className="flex flex-1 item-center gap-1 shadow p-1 rounded-md">
                <div className="flex gap-1 items-center">
                    {selectedTags && selectedTags.map((tag) => (
                        <RemovableTag key={tag.id} tag={tag} onRemove={() => removeTagFilter(tag)} />
                    ))}
                </div>
                <Input
                    placeholder="Buscar questões..."
                    value={(filter?.text ?? "") as string}
                    onChange={handleSearch}
                    className="border-0 shadow-none focus-visible:ring-0"
                />
                <SearchTags items={tags} onSelect={(tag) => addTagFilter(tag)} />
            </div>
            {selectedRowsCount > 0 &&
                <Confirm
                    title={`Tem certeza que deseja apagar ${selectedRowsCount} questões?`}
                    description="Esta ação é irreversível."
                    confirmText="Apagar"
                    onConfirm={() => handleDeleteQuestion(getSelectedQuestionIds() || [])}
                    confirmBtnStyle="bg-red-500 text-white hover:bg-red-600"
                >
                    <ConfirmTrigger>
                        <Button variant="ghost" className="text-red-600 hover:text-red-600">
                            <Trash /> Apagar questões
                        </Button>
                    </ConfirmTrigger>
                </Confirm>
            }
        </menu>
    )
}