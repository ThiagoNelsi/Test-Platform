import QuestionEditor from "@/src/components/question-editor";
import { valitadeMultipleChoice } from "@/src/components/question-types/multiple-choice/utils";
import { TabsContent } from "@/src/components/ui/tabs";
import { useQuestionEditor } from "@/src/context/question-editor-context";
import { errorToast, successToast } from "@/lib/toasters";
import { getApiErrorMessage } from "@/lib/backend-api";
import { useCreateQuestionMutation } from "@/src/hooks/use-api-queries";

export default function CreateQuestionManually() {
  const { question, } = useQuestionEditor();
  const createMutation = useCreateQuestionMutation();

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

    try {
      await createMutation.mutateAsync(formData);
      successToast(`Questão criada com sucesso`);
    } catch (error) {
      errorToast(getApiErrorMessage(error, "Erro ao criar questão"));
    }
  };

  return (
    <TabsContent value="manual" className="p-2">
      <QuestionEditor
        submitAction={handleSubmit}
        submitButtonText="Criar Questão"
      />
    </TabsContent>
  );
}
