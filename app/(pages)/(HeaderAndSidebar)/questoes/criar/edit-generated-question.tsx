import { Badge } from "@/app/components/ui/badge"
import { Button } from "@/app/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/app/components/ui/dialog"
import { Input } from "@/app/components/ui/input"
import { Label } from "@/app/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/app/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select"
import { Textarea } from "@/app/components/ui/textarea"
import { Plus, Tag, X } from "lucide-react"
import { useState } from "react"

export default function EditGeneratedQuestion() {
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)

  // Manipuladores para edição de questão gerada
  const saveEditedQuestion = () => {
    if (!editingQuestion) return

    setGeneratedQuestions(generatedQuestions.map((q) => (q.id === editingQuestion.id ? editingQuestion : q)))
    setEditingQuestion(null)
  }

  const updateEditingOptionText = (id: string, text: string) => {
    if (!editingQuestion) return

    setEditingQuestion({
      ...editingQuestion,
      options: editingQuestion.options.map((opt) => (opt.id === id ? { ...opt, text } : opt)),
    })
  }

  const setEditingCorrectOption = (id: string) => {
    if (!editingQuestion) return

    setEditingQuestion({
      ...editingQuestion,
      options: editingQuestion.options.map((opt) => ({ ...opt, isCorrect: opt.id === id })),
    })
  }

  return (
    <Dialog open={!!editingQuestion} onOpenChange={(open) => !open && setEditingQuestion(null)}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Questão</DialogTitle>
          <DialogDescription>Faça ajustes na questão gerada antes de salvá-la.</DialogDescription>
        </DialogHeader>

        {editingQuestion && (
          <div className="space-y-4 py-4">
            {/* Enunciado */}
            <div className="space-y-2">
              <Label htmlFor="edit-question-text">Enunciado da questão</Label>
              <Textarea
                id="edit-question-text"
                value={editingQuestion.text}
                onChange={(e) => setEditingQuestion({ ...editingQuestion, text: e.target.value })}
                className="min-h-[100px]"
              />
            </div>

            {/* Opções */}
            <div className="space-y-3">
              <Label>Opções de resposta</Label>
              <RadioGroup value={editingQuestion.options.find((opt) => opt.isCorrect)?.id || ""}>
                {editingQuestion.options.map((option, index) => (
                  <div key={option.id} className="flex items-start gap-3 p-3 border rounded-md">
                    <RadioGroupItem
                      value={option.id}
                      id={`edit-${option.id}`}
                      checked={option.isCorrect}
                      onClick={() => setEditingCorrectOption(option.id)}
                      className="mt-2"
                    />
                    <div className="flex-1">
                      <Input
                        placeholder={`Opção ${index + 1}`}
                        value={option.text}
                        onChange={(e) => updateEditingOptionText(option.id, e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2">
                {editingQuestion.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1 pl-2">
                    <Tag className="h-3 w-3" />
                    {tag}
                    <button
                      className="ml-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 p-0.5"
                      onClick={() =>
                        setEditingQuestion({
                          ...editingQuestion,
                          tags: editingQuestion.tags.filter((t) => t !== tag),
                        })
                      }
                    >
                      <X className="h-3 w-3" />
                      <span className="sr-only">Remover tag</span>
                    </button>
                  </Badge>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => {
                    const newTag = prompt("Adicionar nova tag:")
                    if (newTag && !editingQuestion.tags.includes(newTag)) {
                      setEditingQuestion({
                        ...editingQuestion,
                        tags: [...editingQuestion.tags, newTag],
                      })
                    }
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Adicionar Tag</span>
                </Button>
              </div>
            </div>

            {/* Dificuldade */}
            <div className="space-y-2">
              <Label htmlFor="edit-difficulty">Nível de dificuldade</Label>
              <Select
                value={editingQuestion.difficulty}
                onValueChange={(value) =>
                  setEditingQuestion({
                    ...editingQuestion,
                    difficulty: value as "easy" | "medium" | "hard",
                  })
                }
              >
                <SelectTrigger id="edit-difficulty">
                  <SelectValue placeholder="Selecione o nível de dificuldade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Fácil</SelectItem>
                  <SelectItem value="medium">Médio</SelectItem>
                  <SelectItem value="hard">Difícil</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setEditingQuestion(null)}>
            Cancelar
          </Button>
          <Button onClick={saveEditedQuestion}>Salvar Alterações</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
