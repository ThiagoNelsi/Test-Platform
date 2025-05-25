import QuestionEditor from "@/app/components/question-editor";
import { valitadeMultipleChoice } from "@/app/components/question-types/multiple-choice/utils";
import { TabsContent } from "@/app/components/ui/tabs";
import { useQuestionEditor } from "@/app/context/question-editor-context";
import { createQuestion } from "@/lib/question-service";
import { errorToast, successToast } from "@/lib/toasters";
import { tryCatch } from "@/lib/try-catch";

export default function CreateQuestionManually() {
  const { question, } = useQuestionEditor();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const { errors, ...validatedData } = valitadeMultipleChoice(question.data);

    if (errors) {
      return errorToast("- " + errors.join("\n- "));
    }

    const formData = new FormData();
    formData.append("type", e.currentTarget.type.value);
    formData.append("level", e.currentTarget.level.value);
    formData.append("tags", JSON.stringify(question.tags.map((tag) => tag.id)));
    formData.append("data", JSON.stringify(validatedData));

    const { data, error } = await tryCatch(createQuestion(formData));

    if (error || !data) {
      return errorToast(`Erro ao criar questão`);
    }

    successToast(`Questão criada com sucesso`);
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
