import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Checkbox } from "@/app/components/ui/checkbox";
import { createMultipleQuestions } from "@/lib/question-service";
import { Check, Loader2, Save, Sparkles, Tag } from "lucide-react";
import { useState } from "react";
import { StreamedQuestion } from "./create-with-ai";
import { Option } from "@/lib/multiple-choice-question";
import { successToast } from "@/lib/toasters";

type GeneratedQuestionsProps = {
  generatedQuestions: StreamedQuestion[];
  setGeneratedQuestions: (questions: StreamedQuestion[]) => void;
  isGenerating: boolean;
  isReasoning: boolean;
}

export default function GeneratedQuestions({ generatedQuestions, isGenerating, isReasoning }: GeneratedQuestionsProps) {
  const [selectedGeneratedQuestions, setSelectedGeneratedQuestions] = useState<number[]>([])
  const [saveSuccess, setSaveSuccess] = useState(false)

  const toggleQuestionSelection = (id: number) => {
    setSelectedGeneratedQuestions((prev) => (prev.includes(id) ? prev.filter((q) => q !== id) : [...prev, id]))
  }

  const saveGeneratedQuestions = async () => {
    const questionsToSave = generatedQuestions.map((question) => {

      const options = Option.fromArray(question.options || [])

      return {
        type: "multiple_choice",
        source: "AI",
        content: {
          statement: question.statement || "",
          options: Option.toObjectArray(options),
          answer: options[Number(question.answer)].id,
        }
      }
    })

    try {
      await createMultipleQuestions(questionsToSave)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      console.error("Error saving questions:", error)
    }

    successToast("Questões salvas com sucesso!")
  }

  const selectAllGeneratedQuestions = () => {
    if (selectedGeneratedQuestions.length === generatedQuestions.length) {
      setSelectedGeneratedQuestions([])
    } else {
      setSelectedGeneratedQuestions(generatedQuestions.map((_, index) => index))
    }
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Questões Geradas</CardTitle>
          {generatedQuestions.length > 0 && (
            <Button variant="outline" size="sm" onClick={selectAllGeneratedQuestions}>
              {selectedGeneratedQuestions.length === generatedQuestions.length
                ? "Desmarcar Todas"
                : "Selecionar Todas"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isGenerating && !isReasoning && generatedQuestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground mb-4 text-center">Gerando questões...</p>
            <p className="text-sm text-muted-foreground max-w-md mb-6 text-center">
              Isso pode levar alguns minutos, dependendo da quantidade de documentos consultados.
            </p>
          </div>
        ) : isReasoning ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground mb-4 text-center">Analisando as fontes...</p>
            <p className="text-sm text-muted-foreground max-w-md mb-6 text-center">
              Isso pode levar algum tempo, dependendo da quantidade de documentos consultados.
            </p>
          </div>
        ) : generatedQuestions.length > 0 ? (
          <div className="space-y-4">
            {generatedQuestions.map((question, questionIndex) => (
              <div
                key={questionIndex}
                className={`border rounded-lg p-4 transition-colors ${
                  selectedGeneratedQuestions.includes(questionIndex) ? "border-primary bg-primary/5" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedGeneratedQuestions.includes(questionIndex)}
                    onCheckedChange={() => toggleQuestionSelection(questionIndex)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <p className="font-medium mb-2 whitespace-pre-wrap">{question.statement}</p>
                    <div className="space-y-1 mb-3">
                      {question.options?.map((option, index) => (
                        <div
                          key={`${questionIndex}-${index}`}
                          className={`flex items-start gap-2 p-2 rounded-md ${
                            question.answer === String(index)
                              ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                              : ""
                          }`}
                        >
                          <div
                            className={`font-medium min-w-[20px] ${
                              question.answer === String(index) ? "text-green-600 dark:text-green-400" : ""
                            }`}
                          >
                            {["A", "B", "C", "D", "E", "F", "G", "H"][index]})
                          </div>
                          <div>{option}</div>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {
                        question.topic && (
                          <Badge variant="secondary" className="gap-1 pl-2">
                            <Tag className="h-3 w-3" />
                            {question.topic}
                          </Badge>
                        )
                      }
                    </div>
                    {/* <Button variant="outline" size="sm" onClick={() => setEditingQuestion(question)}>
                      Editar Questão
                    </Button> */}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma questão gerada</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              Configure as opções de geração e clique em &quot;Gerar Questões&quot; para criar questões com IA.
            </p>
          </div>
        )}
      </CardContent>
      {generatedQuestions.length > 0 && (
        <CardFooter>
          <Button
            className="w-full gap-2"
            onClick={saveGeneratedQuestions}
            disabled={selectedGeneratedQuestions.length === 0}
          >
            <Save className="h-4 w-4" />
            <span>
              Salvar {selectedGeneratedQuestions.length}{" "}
              {selectedGeneratedQuestions.length === 1 ? "Questão" : "Questões"}
            </span>
          </Button>
        </CardFooter>
      )}
      {/* Mensagem de sucesso */}
      {saveSuccess && (
        <div className="fixed bottom-4 right-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-5">
          <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
          <p className="font-medium">Questão salva com sucesso!</p>
        </div>
      )}
    </Card>
  )
}
