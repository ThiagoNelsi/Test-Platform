"use client";

import { Button } from "@/app/components/ui/button";
import { Search, Trash, X } from "lucide-react";
import { MdAdd } from "react-icons/md";
import Confirm, { ConfirmTrigger } from "@/app/components/ui/confirm";
import { deleteQuestion } from "@/lib/question-service";
import { Input } from "@/app/components/ui/input";
import Link from "next/link";
import { PossibleQuestionTypes } from "@/lib/question";
import { Separator } from "@/app/components/ui/separator";
import GroupLabel from "./group-label";
import { useCallback, useState } from "react";
import { tryCatch } from "@/lib/try-catch";
import { errorToast, successToast } from "@/lib/toasters";
import { Sections } from "./page";
import { useDebounce } from "@/app/hooks/useDebounce";

type Props = {
  groupBy: keyof PossibleQuestionTypes | null;
  setGroupBy: (filter: keyof PossibleQuestionTypes | null) => void;
  groupByOptions: {
    label: string;
    value: keyof PossibleQuestionTypes;
  }[];
  sections: Sections;
  setSections: (sections: Sections) => void;
  subSections: Set<string>;
  selectedSubSections: Set<string>;
  setSelectedSubSections: (sections: Set<string>) => void;
  selectedQuestions: number[];
  setSelectedQuestions: (questions: number[]) => void;
  questions: PossibleQuestionTypes[];
  setQuestions: (questions: PossibleQuestionTypes[]) => void;
  filteredQuestions: PossibleQuestionTypes[];
  setFilteredQuestions: (questions: PossibleQuestionTypes[]) => void;
};

export default function TableActions({
  groupBy,
  groupByOptions,
  setGroupBy,
  sections,
  setSections,
  subSections,
  selectedSubSections,
  setSelectedSubSections,
  selectedQuestions,
  setSelectedQuestions,
  questions,
  setQuestions,
  setFilteredQuestions,
}: Props) {
  const [search, setSearch] = useState<string>("");

  const handleDeleteQuestion = async (questionIds: number[]) => {
    if (questionIds.length === 0) return;

    const { data, error } = await tryCatch(deleteQuestion(questionIds));

    if (error || !data) {
      errorToast("Erro ao apagar questões");
      return;
    }

    successToast("Questões apagadas com sucesso");
    setSelectedQuestions([]);
    setQuestions(questions.filter((question) => !questionIds.includes(question.id)));
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
    debounceFilter();
  };

  const filterQuestions = useCallback(() => {
    const searchValue = search.toLowerCase().trim();

    if (searchValue.length === 0) {
      setFilteredQuestions(questions);
      return;
    }

    const filteredQuestions = questions.filter((question) => {
      const questionText = question.getText().toLowerCase();
      return questionText.includes(searchValue);
    });
    setFilteredQuestions(filteredQuestions);
  }, [search, questions]);

  const debounceFilter = useDebounce(filterQuestions, 300);

  return (
    <menu className="flex flex-col gap-4 mb-4">
      <div className="flex items-center gap-4 justify-between">
        <Button className="bg-blue-500 text-white hover:bg-blue-600">
          <Link href="/questoes/criar" className="flex items-center gap-2">
            <MdAdd /> Criar questão
          </Link>
        </Button>

        {/* Search and filter */}
        <div className="flex flex-1 bg-white item-center gap-1 shadow p-1 rounded-md">
          <div className="relative w-full">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar questões..."
              value={search}
              onChange={handleSearch}
              className="border-0 shadow-none focus-visible:ring-0 w-full pl-9"
            />
          </div>
        </div>

        {/* Delete selected questions */}
        {selectedQuestions.length > 0 && (
          <Confirm
            title={`Tem certeza que deseja apagar ${selectedQuestions.length} questões?`}
            description="Esta ação é irreversível."
            confirmText="Apagar"
            onConfirm={() => {
              handleDeleteQuestion(selectedQuestions);
            }}
            confirmBtnStyle="bg-red-500 text-white hover:bg-red-600"
            verificationText={
              selectedQuestions.length > 5 ? "apagar" : undefined
            }
          >
            <ConfirmTrigger>
              <Button
                variant="ghost"
                className="text-red-600 hover:text-red-600"
              >
                <Trash /> Apagar questões
              </Button>
            </ConfirmTrigger>
          </Confirm>
        )}
      </div>

      {/* Group by options */}
      <div className="flex items-center gap-4">
        <span className="text-xs">Agrupar por:</span>
        <ul className="flex gap-2">
          {groupByOptions.map((option) => (
            <li key={option.label}>
              <Button
                variant="ghost"
                className={`border border-gray-200 p-1 h-6 rounded-full w-28 ${
                  groupBy === option.value
                    ? "bg-blue-100 hover:bg-blue-100 border-blue-300 text-gray-800"
                    : "bg-white text-gray-600 hover:text-gray-800"
                }`}
                onClick={() => setGroupBy(option.value)}
              >
                {option.label}
              </Button>
            </li>
          ))}
        </ul>
      </div>

      {/* Subsections */}
      {subSections.size > 0 && (
        <>
          <Separator />
          <div className="flex items-center gap-4">
            <span className="text-xs">Grupos:</span>
            <ul className="flex flex-wrap gap-2">
              {Array.from(subSections).map((section) => (
                <li key={section}>
                  <Button
                    variant="ghost"
                    className={`border border-gray-200 py-1 px-2 h-6 rounded-full min-w-28 w-fit text-xs ${
                      selectedSubSections.has(section)
                        ? "bg-blue-100 hover:bg-blue-100 border-blue-300 text-gray-800"
                        : "bg-white text-gray-600 hover:text-gray-800"
                    }`}
                    onClick={() => {
                      const newSelectedSubSections = new Set(
                        selectedSubSections
                      );
                      if (newSelectedSubSections.has(section)) {
                        newSelectedSubSections.delete(section);
                      } else {
                        newSelectedSubSections.add(section);
                      }
                      setSelectedSubSections(newSelectedSubSections);
                    }}
                  >
                    <GroupLabel groupBy={groupBy} section={section} />
                  </Button>
                </li>
              ))}
              <li>
                {selectedSubSections.size > 0 && (
                  <Button
                    variant="ghost"
                    className={`border border-red-400 bg-red-100 hover:bg-red-200 text-gray-800 hover:text-gray-800 py-1 px-2 h-6 rounded-full min-w-28 w-fit text-xs`}
                    onClick={() => {
                      const newSelectedSubSections = new Set<string>();
                      setSelectedSubSections(newSelectedSubSections);
                    }}
                  >
                    <X className="h-4 w-4" /> Desmarcar Todos
                  </Button>
                )}
              </li>
            </ul>
          </div>
        </>
      )}
    </menu>
  );
}
