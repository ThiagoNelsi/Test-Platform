"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Question, QuestionType, Tag } from "@/lib/types";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Button } from "@/app/components/ui/button";
import { ArrowUpDown, Edit, Trash } from "lucide-react";
import Confirm, { ConfirmTrigger } from "@/app/components/ui/confirm";
import { deleteQuestion } from "@/lib/question-service";
import { Filter, useTable } from "@/app/context/table-context";
import QuestionDialogTrigger from "./question-dialog-trigger";
import { tagColors } from "@/lib/tag-colors";
import { QuestionFactory } from "@/lib/question";

const questionTypeTranslations: { [key in QuestionType]: string } = {
  multiple_choice: "Múltipla escolha",
  true_or_false: "Verdadeiro ou falso",
};

export const columns: ColumnDef<Question>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value: boolean) =>
          table.toggleAllPageRowsSelected(!!value)
        }
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
      const question = QuestionFactory.from([row.original])[0];
      return (
        <div className="whitespace-pre-wrap">
          {question.getText().slice(0, 200) + "..."}
        </div>
      );
    },
    filterFn: (row, id, value: Filter) => {
      if (!value) return true;

      const { text, tags } = value;

      const tagNames = tags.map((tag) => tag.name);

      const question = QuestionFactory.from([row.original])[0];
      const textMatches =
        question
          .getText()
          .toLowerCase()
          .includes((text as string).toLowerCase()) || !text;

      const tagsMatches =
        tags.length === 0 ||
        row.original.tags.some((tag) => tagNames.includes(tag.name));

      return textMatches && tagsMatches;
    },
  },
  {
    header: "Tipo",
    accessorKey: "type",
    cell: ({ row }) => {
      return questionTypeTranslations[row.original.type];
    },
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
      const levels = ["-", "Fácil", "Médio", "Difícil"];
      const index = (row.original.level ?? -1) + 1;
      const level = levels[index];
      const colors = ["", "text-green-500", "text-yellow-500", "text-red-500"];
      return <p className={colors[index]}>{level}</p>;
    },
  },
  {
    header: "Tags",
    accessorKey: "tags",
    minSize: 100,
    maxSize: 200,
    size: 150,
    cell: ({ row }) => {
      const tags = row.original.tags;
      const { addTagFilter, removeTagFilter, filter } = useTable();

      const selectedTags = filter?.tags;

      const handleClick = (tag: Tag) => {
        if (selectedTags?.some((t) => t.id === tag.id)) {
          removeTagFilter(tag);
        } else {
          addTagFilter(tag);
        }
      };

      return (
        <div className="flex flex-wrap gap-2">
          {tags &&
            tags.map((tag) => (
              <Button
                key={tag.id}
                className={`h-fit shadow-none px-2 py-1 mr-1 rounded-md ${selectedTags?.some((t) => t.id === tag.id) && "border-2"}`}
                style={{
                  backgroundColor: tagColors[tag.color].background,
                  color: tagColors[tag.color].text,
                  borderColor: tagColors[tag.color].border,
                }}
                onClick={() => handleClick(tag)}
              >
                {tag.name}
              </Button>
            ))}
        </div>
      );
    },
  },
  {
    header: "Ações",
    accessorKey: "actions",
    cell: ({ row }) => {
      const { rowSelection, setRowSelection } = useTable();

      const handleDelete = async () => {
        const res = await deleteQuestion([row.original.id]);
        if (res) {
          if (rowSelection[row.id]) {
            const newSelection = { ...rowSelection };
            delete newSelection[row.id];
            setRowSelection(newSelection);
          }
          new BroadcastChannel("question-change").postMessage({
            type: "delete",
            questionId: row.original.id,
          });
        }
      };

      return (
        <div>
          <QuestionDialogTrigger type="edit" initialData={row.original}>
            <Button className="hover:bg-verdigris" variant="ghost" size="sm">
              <Edit /> Editar
            </Button>
          </QuestionDialogTrigger>
          <Confirm
            title={`Tem certeza que deseja apagar a questão?`}
            description="Esta ação é irreversível."
            confirmText="Apagar"
            onConfirm={handleDelete}
            confirmBtnStyle="bg-red-500 text-white hover:bg-red-600"
          >
            <ConfirmTrigger>
              <Button className="hover:bg-red-400" variant="ghost" size="sm">
                <Trash /> Deletar
              </Button>
            </ConfirmTrigger>
          </Confirm>
        </div>
      );
    },
  },
];
