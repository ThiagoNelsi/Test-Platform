"use client";

import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { ReactNode } from "react";
import { createQuestion, updateQuestion } from "@/lib/question-service";
import QuestionEditor from "./question-editor";
import { useQuestionEditor } from "../context/question-editor-context";
import { valitadeMultipleChoice } from "./question-types/multiple-choice/utils";
import { errorToast, successToast } from "@/lib/toasters";

type NewQuestionModalProps = {
  type: "create" | "edit";
  closeDialog(): void;
};

export const FormSection = ({ children }: { children: ReactNode }) => (
  <div className="border-l-2 border-gray-200 pl-4">{children}</div>
);

const CreateQuestionHeader = () => {
  return (
    <DialogHeader>
      <DialogTitle>Criar questão</DialogTitle>
      <DialogDescription>
        Preencha os campos abaixo para criar uma nova questão.
      </DialogDescription>
    </DialogHeader>
  );
};

const EditQuestionHeader = () => {
  return (
    <DialogHeader>
      <DialogTitle>Editar questão</DialogTitle>
      <DialogDescription>
        Edite os campos abaixo para alterar a questão.
      </DialogDescription>
    </DialogHeader>
  );
};

export default function NewQuestionModal({
  type,
  closeDialog,
}: NewQuestionModalProps) {
  const { question } = useQuestionEditor();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const { errors, ...validatedData } = valitadeMultipleChoice(question.content);

    if (errors) {
      return errorToast("- " + errors.join("\n- "));
    }

    const formData = new FormData();
    formData.append("type", e.currentTarget.type.value);
    formData.append("level", e.currentTarget.level.value);
    formData.append("tags", JSON.stringify(question.tags.map((tag) => tag.id)));
    formData.append("data", JSON.stringify(validatedData));

    let res = null;
    let messageWord = "criar";

    if (type === "create") {
      res = await createQuestion(formData);
    } else {
      messageWord = "editada";
      if (!question.id) return errorToast("Erro ao editar questão");
      res = await updateQuestion(question.id, formData);
      new BroadcastChannel("question-change").postMessage({
        type: "update",
        questionId: question.id,
      });
    }

    if (!res) {
      return errorToast(`Erro ao ${messageWord} questão`);
    }

    successToast(`Questão ${messageWord} com sucesso`);
    closeDialog();
  };

  const buttonText = type === "create" ? "Criar questão" : "Salvar alterações";

  return (
    <DialogContent className="max-h-[95vh] md:max-w-[1200px] overflow-auto">
      {type === "create" ? <CreateQuestionHeader /> : <EditQuestionHeader />}
      <QuestionEditor
        submitAction={handleSubmit}
        submitButtonText={buttonText}
      />
    </DialogContent>
  );
}
