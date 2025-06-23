import { Dialog, DialogTrigger } from "@/app/components/ui/dialog";
import NewQuestionModal from "@/app/components/new-question-modal";
import { useQuestionEditor } from "@/app/context/question-editor-context";
import { useState } from "react";
import { MultipleChoiceQuestion } from "@/lib/multiple-choice-question";
import { PossibleQuestionTypes } from "@/lib/question";

type QuestionDialogTriggerProps = {
  children: React.ReactNode;
  type: "create" | "edit";
  initialData?: PossibleQuestionTypes;
};

export default function QuestionDialogTrigger({
  children,
  type,
  initialData,
}: QuestionDialogTriggerProps) {
  const [open, setOpen] = useState(false);
  const { setData, setType, setLevel, setId, setTags } = useQuestionEditor();

  const setInitialData = (question: PossibleQuestionTypes) => {
    setId(question.id);
    setData(question.content);
    setType(question.type);
    setLevel(question.level);
    setTags(question.tags);
  };

  const clearInitialData = () => {
    const question = MultipleChoiceQuestion.empty();
    setData(question.content);
    setType(question.type);
    setLevel(question.level);
    setTags(question.tags);
  };

  return (
    <Dialog
      onOpenChange={(open) => {
        if (open) {
          if (type === "create") clearInitialData();
          else if (type === "edit" && initialData) setInitialData(initialData);
        }
        setOpen(open);
      }}
      open={open}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <NewQuestionModal type={type} closeDialog={() => setOpen(false)} />
    </Dialog>
  );
}
