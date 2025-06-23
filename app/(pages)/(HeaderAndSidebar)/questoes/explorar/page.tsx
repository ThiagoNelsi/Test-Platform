"use client"

import { useEffect, useState } from "react"
import { BookOpen, Check, ChevronDown, Filter, LoaderCircle, Plus, Search, X } from "lucide-react"
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import { Badge } from "@/app/components/ui/badge"
import { Card, CardContent } from "@/app/components/ui/card"
import { Checkbox } from "@/app/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog"
import { Pagination } from "./components/pagination"
import { getQuestions } from "@/lib/question-service"
import { QuestionFactory } from "@/lib/question"
import { Tag } from "@/lib/types"
import { errorToast } from "@/lib/toasters"
import MultipleChoiceCard from "@/app/components/question-types/multiple-choice/card"

const alternatives = ['A', 'B', 'C', 'D', 'E']

export default function ExploreQuestionsPage() {
  // State for filters
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])
  const [selectedSources, setSelectedSources] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)

  // State for questions
  const [questions, setQuestions] = useState<ReturnType<typeof QuestionFactory.from>>([])
  const [subjects, setSubjects] = useState<string[]>([])
  const [sources, setSources] = useState<string[]>([])
  const [topics, setTopics] = useState<Tag[]>([])
  const [filteredQuestions, setFilteredQuestions] = useState<ReturnType<typeof QuestionFactory.from>>([])
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [questionsPerPage] = useState(10)

  // State for question dialog
  const [viewQuestion, setViewQuestion] = useState<ReturnType<typeof QuestionFactory.from>[0] | null>(null)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData();
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const response = await fetch("/api/repositorio");

    if (!response.ok) {
      errorToast("Erro ao buscar questões")
      return
    }
    const data = await response.json()
    if (data.error) {
      errorToast("Erro ao buscar questões")
      return
    }

    const parsed = QuestionFactory.from(data.questions.map((question: any) => ({
      ...question,
      content: JSON.parse(question.content)
    })))
    setQuestions(parsed);
    setFilteredQuestions(parsed);

    const subjectsSet = new Set<string>();
    const topicsSet = new Set<Tag>();
    const sourcesSet = new Set<string>();

    parsed.forEach(question => {
      question.subjects.forEach(s => subjectsSet.add(s))
      question.tags.forEach(t => topicsSet.add(t));
      if (question.source) {
        sourcesSet.add(question.source)
      }
    })

    setSubjects(Array.from(subjectsSet))
    setTopics(Array.from(topicsSet));
    setSources(Array.from(sourcesSet));
    setLoading(false);
  }

  const applyFilters = () => {
    let results = questions

    if (searchQuery) {
      results = results.filter((q) => q.content.statement.toLowerCase().includes(searchQuery.toLowerCase()))
    }

    if (selectedSubjects.length > 0) {
      results = results.filter((q) => q.subjects.some((s) => selectedSubjects.includes(s)))
    }

    if (selectedTopics.length > 0) {
      results = results.filter((q) => q.tags.some((t) => selectedTopics.includes(String(t.id))))
    }

    if (selectedSources.length > 0) {
      results = results.filter((q) => q.source && selectedSources.includes(q.source))
    }

    setFilteredQuestions(results)
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setSearchQuery("")
    setSelectedSubjects([])
    setSelectedTopics([])
    setSelectedSources([])
    setFilteredQuestions(questions)
  }

  const getAvailableTopics = (subjects: string[]) => {
    const set = new Set(subjects.flatMap((subject) => {
      const subjectTopics = questions.find((q) => q.subjects.includes(subject))?.tags || []
      return subjectTopics;
    }));
    return Array.from(set);
  }

  // Handle subject selection
  const handleSubjectChange = (subject: string, checked: boolean) => {
    if (checked) {
      setSelectedSubjects((prev) => [...prev, subject])
      return
    }

    const newSubjects = selectedSubjects.filter((id) => id !== subject)
    setSelectedSubjects(newSubjects)

    const availableTopics = getAvailableTopics(newSubjects)
    setSelectedTopics((prev) => prev.filter((topicId) => availableTopics.some(t => String(t.id) === topicId)))
  }

  // Handle topic selection
  const handleTopicChange = (topicId: string, checked: boolean) => {
    if (checked) {
      setSelectedTopics((prev) => [...prev, topicId])
    } else {
      setSelectedTopics((prev) => prev.filter((id) => id !== topicId))
    }
  }

  // Handle source selection
  const handleSourceChange = (sourceId: string, checked: boolean) => {
    if (checked) {
      setSelectedSources((prev) => [...prev, sourceId])
    } else {
      setSelectedSources((prev) => prev.filter((id) => id !== sourceId))
    }
  }

  // Handle question selection
  const handleQuestionSelection = (questionId: number) => {
    setSelectedQuestions((prev) => {
      if (prev.includes(questionId)) {
        return prev.filter((id) => id !== questionId)
      } else {
        return [...prev, questionId]
      }
    })
  }

  // Handle adding selected questions to personal bank
  const handleAddToPersonalBank = async () => {
    const res = await fetch("/api/question/clone", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ questionIds: selectedQuestions }),
    })

    if (res.ok) {
      setShowSuccessDialog(true)
      setSelectedQuestions([])
      setFilteredQuestions((prev) => prev.filter((q) => !selectedQuestions.includes(q.id)))
    } else {
      errorToast("Erro ao adicionar questões ao banco pessoal")
    }
  }

  // Get current questions for pagination
  const indexOfLastQuestion = currentPage * questionsPerPage
  const indexOfFirstQuestion = indexOfLastQuestion - questionsPerPage
  const currentQuestions = filteredQuestions.slice(indexOfFirstQuestion, indexOfLastQuestion)

  // Change page
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber)

  // Get available topics based on selected subjects
  const availableTopics = getAvailableTopics(selectedSubjects);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 h-[90vh]">
        <LoaderCircle className="h-12 w-12 text-muted-foreground animate-spin" />
        <div className="flex flex-col items-center">
          <h2 className="text-lg font-semibold mb-4">Carregando questões...</h2>
        </div>
      </div>
    )
  }

  if (!subjects) return null

  return (
    <div className="h-screen">
      <div id="main-content" className="flex flex-col flex-1 transition-all duration-300 ease-in-out">
        {/* Main Content */}
        <main className="flex-1 p-6 mx-auto">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h1 className="text-2xl font-bold">Explorar Questões</h1>
              <p className="text-muted-foreground">Busque e adicione questões de vestibulares ao seu banco pessoal</p>
            </div>

            <Button
              variant={showFilters ? "default" : "outline"}
              className="gap-2"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
              <span>{showFilters ? "Ocultar Filtros" : "Mostrar Filtros"}</span>
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar por enunciado ou palavras-chave..."
                  className="w-full pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={applyFilters}>Aplicar Filtros</Button>
                <Button variant="outline" onClick={clearFilters}>
                  Limpar Filtros
                </Button>
              </div>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                {/* Subjects Filter */}
                <div>
                  <h3 className="font-medium mb-3">Disciplinas</h3>
                  <div className="space-y-2 max-h-60 pr-2 overflow-y-auto">
                    {subjects.map((subject) => (
                      <div key={subject} className="flex items-center space-x-2">
                        <Checkbox
                          id={`subject-${subject}`}
                          checked={selectedSubjects.includes(subject)}
                          onCheckedChange={(checked) => handleSubjectChange(subject, checked === true)}
                        />
                        <label
                          htmlFor={`subject-${subject}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {subject}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Topics Filter */}
                {/* <div>
                  <h3 className="font-medium mb-3">Tópicos</h3>
                  {selectedSubjects.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                      {availableTopics.map((topic) => (
                        <div key={topic.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`topic-${topic.id}`}
                            checked={selectedTopics.includes(String(topic.id))}
                            onCheckedChange={(checked) => handleTopicChange(String(topic.id), checked === true)}
                          />
                          <label
                            htmlFor={`topic-${topic.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {topic.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Selecione pelo menos uma disciplina para ver os tópicos disponíveis.
                    </p>
                  )}
                </div> */}

                {/* Sources Filter */}
                <div>
                  <h3 className="font-medium mb-3">Fontes</h3>
                  <div className="space-y-2 max-h-60 pr-2">
                    {sources.map((source) => (
                      <div key={source} className="flex items-center space-x-2">
                        <Checkbox
                          id={`source-${source}`}
                          checked={selectedSources.includes(source)}
                          onCheckedChange={(checked) => handleSourceChange(source, checked === true)}
                        />
                        <label
                          htmlFor={`source-${source}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {source}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Applied Filters */}
            {(selectedSubjects.length > 0 || selectedTopics.length > 0 || selectedSources.length > 0) && (
              <div className="flex flex-wrap gap-2 mt-4">
                {selectedSubjects.map((subjectId) => {
                  const subject = subjects.find((s) => s === subjectId)
                  return subject ? (
                    <Badge key={subject} variant="secondary" className="gap-1">
                      {subject}
                      <button
                        onClick={() => handleSubjectChange(subject, false)}
                        className="ml-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 p-0.5"
                      >
                        <X className="h-3 w-3" />
                        <span className="sr-only">Remove {subject}</span>
                      </button>
                    </Badge>
                  ) : null
                })}

                {selectedTopics.map((topicId) => {
                  const topic = availableTopics.find((t) => String(t.id) === topicId)
                  return topic ? (
                    <Badge key={topic.id} variant="secondary" className="gap-1">
                      {topic.name}
                      <button
                        onClick={() => handleTopicChange(String(topic.id), false)}
                        className="ml-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 p-0.5"
                      >
                        <X className="h-3 w-3" />
                        <span className="sr-only">Remove {topic.name}</span>
                      </button>
                    </Badge>
                  ) : null
                })}

                {selectedSources.map((sourceId) => {
                  const source = sources.find((s) => s === sourceId)
                  return source ? (
                    <Badge key={source} variant="secondary" className="gap-1">
                      {source}
                      <button
                        onClick={() => handleSourceChange(source, false)}
                        className="ml-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 p-0.5"
                      >
                        <X className="h-3 w-3" />
                        <span className="sr-only">Remove {source}</span>
                      </button>
                    </Badge>
                  ) : null
                })}

                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={clearFilters}>
                  Limpar todos
                </Button>
              </div>
            )}
          </div>

          {/* Questions List */}
          <div className="space-y-4">
            {currentQuestions.length > 0 ? (
              <>
                {currentQuestions.map((question) => (
                  <MultipleChoiceCard
                    key={question.id}
                    checked={selectedQuestions.includes(question.id)}
                    onCheckedChange={() => handleQuestionSelection(question.id)}
                    question={question}
                    showTags={false}
                  >
                    <div className="flex justify-end gap-2 mt-4">
                      <Button variant="outline" size="sm" onClick={() => setViewQuestion(question)}>
                        Visualizar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (!selectedQuestions.includes(question.id)) {
                            handleQuestionSelection(question.id)
                          }
                          handleAddToPersonalBank()
                        }}
                      >
                        Adicionar ao Banco Pessoal
                      </Button>
                    </div>
                  </MultipleChoiceCard>
                ))}

                {/* Pagination */}
                <Pagination
                  questionsPerPage={questionsPerPage}
                  totalQuestions={filteredQuestions.length}
                  currentPage={currentPage}
                  paginate={paginate}
                />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-gray-800 rounded-lg shadow">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium mb-2">Nenhuma questão encontrada</h3>
                <p className="text-muted-foreground mb-6">Tente ajustar seus filtros ou buscar por outros termos.</p>
                <Button onClick={clearFilters}>Limpar Filtros</Button>
              </div>
            )}
          </div>
        </main>

        {/* Footer with Actions */}
        {selectedQuestions.length > 0 && (
          <footer className="sticky bottom-0 bg-white dark:bg-gray-800 border-t shadow-[0_-2px_10px_rgba(0,0,0,0.05)] p-4">
            <div className="container max-w-7xl mx-auto flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {selectedQuestions.length}{" "}
                  {selectedQuestions.length === 1 ? "questão selecionada" : "questões selecionadas"}
                </span>
              </div>

              <Button onClick={handleAddToPersonalBank} className="gap-2">
                <Plus className="h-4 w-4" />
                <span>Adicionar ao Banco Pessoal</span>
              </Button>
            </div>
          </footer>
        )}
      </div>

      {/* Question View Dialog */}
      {viewQuestion && (
        <Dialog open={!!viewQuestion} onOpenChange={() => setViewQuestion(null)}>
          <DialogContent className="sm:max-w-3xl 2xl:h-[90%] h-fit max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Visualizar Questão</DialogTitle>
              <DialogDescription>
                Veja os detalhes completos da questão antes de adicioná-la ao seu banco pessoal.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Question metadata */}
              <div className="flex flex-wrap gap-2 mb-4">
                {viewQuestion.subjects.map((subjectId: string) => {
                  const subject = subjects.find((s) => s === subjectId)
                  return subject ? (
                    <Badge key={subject} variant="outline">
                      {subject}
                    </Badge>
                  ) : null
                })}

                {sources.find((s) => s === viewQuestion.source) && (
                  <Badge className="bg-primary">
                    {sources.find((s) => s === viewQuestion.source)}
                  </Badge>
                )}
              </div>

              {/* Question text */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                <p className="font-medium mb-6 whitespace-pre-wrap prose-lg">{viewQuestion.content.statement}</p>

                <div className="space-y-3">
                  {viewQuestion.content.options.map((option, index) => (
                    <div
                      key={option.id}
                      className={`flex items-start gap-2 p-2 rounded-md ${
                        index === Number(viewQuestion.content.answer)
                          ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                          : ""
                      }`}
                    >
                      <div
                        className={`font-medium min-w-[20px] ${
                          index === Number(viewQuestion.content.answer) ? "text-green-600 dark:text-green-400" : ""
                        }`}
                      >
                        {alternatives[index].toUpperCase()})
                      </div>
                      <div>{option.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setViewQuestion(null)}>
                Fechar
              </Button>
              <Button
                onClick={() => {
                  if (!selectedQuestions.includes(viewQuestion.id)) {
                    handleQuestionSelection(viewQuestion.id)
                  }
                  handleAddToPersonalBank()
                  setViewQuestion(null)
                }}
              >
                Adicionar ao Banco Pessoal
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Questões Adicionadas</DialogTitle>
            <DialogDescription>As questões foram adicionadas com sucesso ao seu banco pessoal.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-6">
            <div className="rounded-full bg-green-100 dark:bg-green-900 p-3">
              <Check className="h-6 w-6 text-green-600 dark:text-green-300" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowSuccessDialog(false)} className="w-full">
              Continuar Explorando
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
