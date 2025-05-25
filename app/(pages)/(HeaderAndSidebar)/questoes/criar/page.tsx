"use client"

import { useState, useEffect } from "react"
import {
  BookOpen,
  Sparkles,
} from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/app/components/ui/tabs"

import CreateQuestionManually from "./create-manually"
import CreateWithAI from "./create-with-ai"
import { QuestionEditorProvider } from "@/app/context/question-editor-context"

export default function CreateQuestionPage() {
  const [activeTab, setActiveTab] = useState("manual")

  return (
    <QuestionEditorProvider>

      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <div id="main-content" className="flex flex-col flex-1 transition-all duration-300 ease-in-out">
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
              <CreateWithAI />
            </Tabs>
          </main>
        </div>
      </div>
    </QuestionEditorProvider>
  )
}
