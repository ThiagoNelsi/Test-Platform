import MultipleChoiceCard from "@/src/components/question-types/multiple-choice/card";
import QuestionDialogTrigger from "./question-dialog-trigger";
import { Button } from "@/src/components/ui/button";
import { ChevronDown, ChevronUp, Edit, Trash } from "lucide-react";
import Confirm, { ConfirmTrigger } from "@/src/components/ui/confirm";
import { errorToast } from "@/lib/toasters";
import { PossibleQuestionTypes } from "@/lib/question";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/src/components/ui/collapsible";
import GroupLabel from "./group-label";
import { useDeleteQuestionsMutation } from "@/src/hooks/use-api-queries";
import { getApiErrorMessage } from "@/lib/backend-api";

type Props = {
  groupBy: keyof PossibleQuestionTypes | null;
  section: string;
  questions: PossibleQuestionTypes[];
  defaultOpen?: boolean;
  selectedQuestions: number[];
  setSelectedQuestions: (questions: number[]) => void;
};

export default function SectionList({
  groupBy,
  section,
  questions,
  defaultOpen,
  selectedQuestions,
  setSelectedQuestions,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const deleteMutation = useDeleteQuestionsMutation();

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync([id]);
      setSelectedQuestions(selectedQuestions.filter((questionId) => questionId !== id));
      const channel = new BroadcastChannel("question-change");
      channel.postMessage({
        type: "delete",
        questionId: id,
      });
      channel.close();
    } catch (error) {
      errorToast(getApiErrorMessage(error, "Erro ao apagar questão"));
    }
  };

  const toggleSelection = (id: number) => {
    if (selectedQuestions.includes(id)) {
      setSelectedQuestions(selectedQuestions.filter((q) => q !== id));
    } else {
      setSelectedQuestions([...selectedQuestions, id]);
    }
  };

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="flex flex-col gap-4 bg-gray-100 dark:bg-gray-800 p-4 mb-4 rounded-md"
    >
      <CollapsibleTrigger className="w-full flex items-center justify-between gap-2">
        <h2 className="text-base font-bold">
          {groupBy ? (
            <>
              <GroupLabel groupBy={groupBy} section={section} /> -{" "}
            </>
          ) : (
            <span>Todas - </span>
          )}
          <span className="text-sm font-medium">
            {questions.length} {questions.length === 1 ? "questão" : "questões"}
          </span>
        </h2>
        {open ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="pb-4">
        <div className="flex flex-col items-center gap-4 mb-4">
          {questions.map((question, index) => (
            <MultipleChoiceCard
              key={index}
              question={question}
              showTags={true}
              checkable={true}
              checked={selectedQuestions.includes(question.id)}
              onCheckedChange={toggleSelection}
              maxHeight="80"
            >
              <QuestionDialogTrigger type="edit" initialData={question}>
                <Button
                  className="hover:bg-verdigris"
                  variant="ghost"
                  size="sm"
                >
                  <Edit /> Editar
                </Button>
              </QuestionDialogTrigger>
              <Confirm
                title={`Tem certeza que deseja apagar a questão?`}
                description="Esta ação é irreversível."
                confirmText="Apagar"
                onConfirm={() => handleDelete(question.id)}
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
            </MultipleChoiceCard>
          ))}
        </div>
      </CollapsibleContent>
      {open && (
        <CollapsibleTrigger className="w-full flex items-center justify-center gap-2">
          <span className="text-sm">Fechar</span>
          <ChevronUp className="h-4 w-4" />
        </CollapsibleTrigger>
      )}
    </Collapsible>
  );
}
