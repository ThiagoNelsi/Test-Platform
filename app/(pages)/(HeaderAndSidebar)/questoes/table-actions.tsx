"use client";

import { Button } from "@/app/components/ui/button";
import { Search, Trash } from "lucide-react";
import { MdAdd } from "react-icons/md";
import { useTable } from "@/app/context/table-context";
import Confirm, { ConfirmTrigger } from "@/app/components/ui/confirm";
import { deleteQuestion } from "@/lib/question-service";
import QuestionDialogTrigger from "./question-dialog-trigger";
import { Input } from "@/app/components/ui/input";
import { useEffect, useState } from "react";
import { Tag } from "@/lib/types";
import { RemovableTag } from "@/app/components/removable-tag";
import { SearchTags } from "@/app/components/search-tags";
import Link from "next/link";

export default function TableActions() {
  const {
    table,
    rowSelection,
    setRowSelection,
    filter,
    setFilter,
    removeTagFilter,
    addTagFilter,
  } = useTable();
  const [tags, setTags] = useState<Tag[]>([]);
  const selectedRowsCount = Object.keys(rowSelection).length;
  const selectedTags = filter?.tags;

  useEffect(() => {
    if (table) {
      const tags = table
        .getRowModel()
        .rows.map((row) => {
          const question = row.original as { tags: Tag[] };
          return question.tags;
        })
        .flat();
      const uniqueTags: Tag[] = [];
      tags.forEach((tag) => {
        if (!uniqueTags.some((t) => t.id === tag.id)) {
          uniqueTags.push(tag);
        }
      });
      setTags(uniqueTags);
    }
  }, [table]);

  const getSelectedQuestionIds = () => {
    const tableRows = table?.getRowModel().rows;
    const rows = tableRows?.filter((row) => rowSelection[row.id]);
    return rows?.map((row) => (row.original as { id: number }).id);
  };

  const handleDeleteQuestion = async (questionIds: number[]) => {
    if (questionIds.length === 0) return;

    const res = await deleteQuestion(questionIds);
    if (res) {
      setRowSelection({});
    }
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilter({
      text: event.target.value,
      tags: filter?.tags ?? [],
    });
  };

  return (
    <menu className="flex items-center gap-4 justify-between mb-4">
      <Button className="bg-blue-500 text-white hover:bg-blue-600">
        <Link href="/questoes/criar" className="flex items-center gap-2">
          <MdAdd /> Criar questão
        </Link>
      </Button>
      <div className="flex flex-1 bg-white item-center gap-1 shadow p-1 rounded-md">
        <div className="flex gap-1 items-center">
          {selectedTags &&
            selectedTags.map((tag) => (
              <RemovableTag
                key={tag.id}
                tag={tag}
                onRemove={() => removeTagFilter(tag)}
              />
            ))}
        </div>
        <div className="relative w-full">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
          type="search"
            placeholder="Buscar questões..."
            value={(filter?.text ?? "") as string}
            onChange={handleSearch}
            className="border-0 shadow-none focus-visible:ring-0 w-full pl-9"
          />
        </div>
        <SearchTags items={tags} onSelect={(tag) => addTagFilter(tag)} />
      </div>
      {selectedRowsCount > 0 && (
        <Confirm
          title={`Tem certeza que deseja apagar ${selectedRowsCount} questões?`}
          description="Esta ação é irreversível."
          confirmText="Apagar"
          onConfirm={() => handleDeleteQuestion(getSelectedQuestionIds() || [])}
          confirmBtnStyle="bg-red-500 text-white hover:bg-red-600"
          verificationText={selectedRowsCount > 5 ? "apagar" : undefined}
        >
          <ConfirmTrigger>
            <Button variant="ghost" className="text-red-600 hover:text-red-600">
              <Trash /> Apagar questões
            </Button>
          </ConfirmTrigger>
        </Confirm>
      )}
    </menu>
  );
}
