import QuestionEditor from "@/app/components/question-editor";
import { TabsContent } from "@/app/components/ui/tabs";

export default function CreateQuestionManually() {
    return (
      <TabsContent value="manual" className="bg-white p-2">
        <QuestionEditor
          submitAction={() => {}}
          submitButtonText="Criar Questão"
        />
      </TabsContent>
    )
}
