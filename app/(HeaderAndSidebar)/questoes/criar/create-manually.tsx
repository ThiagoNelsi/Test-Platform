import QuestionEditor from "@/app/components/question-editor";
import { TabsContent } from "@/app/components/ui/tabs";

export default function CreateQuestionManually() {
    return (
      <TabsContent value="manual">
        <QuestionEditor
          submitAction={() => {}}
          submitButtonText="Criar Questão"
        />
      </TabsContent>
    )
}
