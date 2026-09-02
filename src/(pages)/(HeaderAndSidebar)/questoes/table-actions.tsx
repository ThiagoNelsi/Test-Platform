
import { Button } from "@/src/components/ui/button";
import { Search, Trash, X } from "lucide-react";
import { Checkbox } from "@/src/components/ui/checkbox";
import { MdAdd } from "react-icons/md";
import Confirm, { ConfirmTrigger } from "@/src/components/ui/confirm";
import { Input } from "@/src/components/ui/input";
import { AppLink as Link } from "@/src/components/router-helpers";
import { PossibleQuestionTypes } from "@/lib/question";
import { Separator } from "@/src/components/ui/separator";
import GroupLabel from "./group-label";
import { useDeleteQuestionsMutation } from "@/src/hooks/use-api-queries";
import { getApiErrorMessage } from "@/lib/backend-api";
import { errorToast, successToast } from "@/lib/toasters";

type Props = {
  groupBy: keyof PossibleQuestionTypes | null;
  setGroupBy: (filter: keyof PossibleQuestionTypes | null) => void;
  groupByOptions: {
    label: string;
    value: keyof PossibleQuestionTypes;
  }[];
  subSections: Set<string>;
  selectedSubSections: Set<string>;
  setSelectedSubSections: (sections: Set<string>) => void;
  selectedQuestions: number[];
  setSelectedQuestions: (questions: number[]) => void;
  search: string;
  setSearch: (search: string) => void;
};

export default function TableActions({
  groupBy,
  groupByOptions,
  setGroupBy,
  subSections,
  selectedSubSections,
  setSelectedSubSections,
  selectedQuestions,
  setSelectedQuestions,
  search,
  setSearch,
}: Props) {
  const deleteMutation = useDeleteQuestionsMutation();

  const handleDeleteQuestion = async (questionIds: number[]) => {
    if (questionIds.length === 0) return;

    try {
      await deleteMutation.mutateAsync(questionIds);
      successToast("Questões apagadas com sucesso");
      setSelectedQuestions([]);
    } catch (error) {
      errorToast(getApiErrorMessage(error, "Erro ao apagar questões"));
    }
  };

  return (
    <menu className="flex flex-col gap-4 mb-4">
      <div className="flex items-center gap-4 justify-between">
        <Button className="bg-blue-500 text-white hover:bg-blue-600">
          <Link to="/questoes/criar" className="flex items-center gap-2">
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
              onChange={(event) => setSearch(event.target.value)}
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
              {Array.from(subSections).map((section) => {
                const isSelected = selectedSubSections.has(section);

                return (
                  <li key={section}>
                    <label
                      className={`inline-flex h-7 w-fit min-w-28 cursor-pointer select-none items-center gap-2 rounded-md border px-2.5 text-xs leading-none transition-colors ${
                        isSelected
                          ? "border-blue-300 bg-blue-50 text-gray-800 hover:bg-blue-100"
                          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800"
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        aria-label={`Exibir grupo ${section}`}
                        className="h-4 w-4 border-gray-400 shadow-none data-[state=checked]:border-blue-500 data-[state=checked]:bg-blue-500 [&_svg]:h-3 [&_svg]:w-3"
                        onCheckedChange={() => {
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
                      />
                      <GroupLabel groupBy={groupBy} section={section} />
                    </label>
                  </li>
                );
              })}
              <li>
                {selectedSubSections.size > 0 && (
                  <Button
                    variant="ghost"
                    className="h-7 w-fit min-w-28 justify-start gap-2 rounded-md border border-red-400 bg-red-100 hover:bg-red-200 px-2.5 py-0 text-xs font-normal leading-none text-red-700 hover:text-red-800 [&_svg]:size-3"
                    onClick={() => {
                      const newSelectedSubSections = new Set<string>();
                      setSelectedSubSections(newSelectedSubSections);
                    }}
                  >
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-red-500 bg-red-500 text-white">
                      <X />
                    </span>
                    Desmarcar todos
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
