
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { ReactNode } from "react";
import QuestionEditor from "./question-editor";
import { useQuestionEditor } from "../context/question-editor-context";
import { valitadeMultipleChoice } from "./question-types/multiple-choice/utils";
import { errorToast, successToast } from "@/lib/toasters";
import {
  useCreateQuestionMutation,
  useUpdateQuestionMutation,
} from "@/src/hooks/use-api-queries";
import { getApiErrorMessage } from "@/lib/backend-api";

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
  const createMutation = useCreateQuestionMutation();
  const updateMutation = useUpdateQuestionMutation();

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

    let messageWord = "criar";

    try {
      if (type === "create") {
        await createMutation.mutateAsync(formData);
      } else {
        messageWord = "editada";
        if (!question.id) return errorToast("Erro ao editar questão");
        await updateMutation.mutateAsync({
          questionId: question.id,
          formData,
        });
        const channel = new BroadcastChannel("question-change");
        channel.postMessage({
          type: "update",
          questionId: question.id,
        });
        channel.close();
      }

      successToast(`Questão ${messageWord} com sucesso`);
      closeDialog();
    } catch (error) {
      errorToast(
        getApiErrorMessage(error, `Erro ao ${messageWord} questão`),
      );
    }
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
