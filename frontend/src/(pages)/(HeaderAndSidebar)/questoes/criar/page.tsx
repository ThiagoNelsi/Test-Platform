
import { Suspense, useState } from "react"
import {
  BookOpen,
  Sparkles,
} from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/src/components/ui/tabs"

import CreateQuestionManually from "./create-manually"
import CreateWithAI from "./create-with-ai"
import { QuestionEditorProvider } from "@/src/context/question-editor-context"
import { useAppSearchParams as useSearchParams } from "@/src/components/router-helpers"

function CreateQuestionContent() {
  const [params] = useSearchParams();
  const initalTab = params.get("tab") || "manual";
  const resourceId = params.get("resourceId");

  const [activeTab, setActiveTab] = useState(initalTab);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col flex-1 transition-all duration-300 ease-in-out">
          <main className="flex-1">
            {/* Abas para alternar entre criação manual e IA */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="manual" className="gap-2">
                  <BookOpen className="h-4 w-4" />
                  <span>Criar Manualmente</span>
                </TabsTrigger>
                <TabsTrigger value="ai" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  <span>Gerar com Inteligência Artificial</span>
                </TabsTrigger>
              </TabsList>

              <CreateQuestionManually />
              <CreateWithAI preSelectedResource={resourceId ? resourceId : undefined} />
            </Tabs>
          </main>
        </div>
    </div>
  )
}

export default function CreateQuestionPage() {
  return (
    <QuestionEditorProvider>
      <Suspense fallback={<div>Carregando...</div>}>
        <CreateQuestionContent />
      </Suspense>
    </QuestionEditorProvider>
  );
}
