import { Button } from "@/app/components/ui/button";
import { MdAutorenew } from "react-icons/md";
import { Section, TestBuilderContext } from "./test-builder";
import { IoClose } from "react-icons/io5";
import QuestionRenderer from "@/app/components/question-renderer";
import { IQuestion } from "@/lib/types";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Separator } from "@/app/components/ui/separator";
import { Input } from "@/app/components/ui/input";
import { useContext } from "react";
import { FaArrowDown, FaArrowUp } from "react-icons/fa";

type SectionQuestionsProps = {
    section: Section;
    setOpen: (open: boolean) => void;
    onRemove: (question: IQuestion) => void;
}

const Card = ({ children, onSelect, isSelected }: { children: React.ReactNode, onSelect: () => void, isSelected: boolean }) => (
    <div
        onClick={onSelect}
        className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-500 hover:bg-blue-100 ${isSelected ? "bg-green-100 border-green-500 hover:bg-green-100 hover:border-green-500" : "border-gray-300 "}`}
    >
        {children}
    </div>
)

export default function SectionQuestions({ section, setOpen, onRemove }: SectionQuestionsProps) {
    const { updateSection } = useContext(TestBuilderContext)

    const handleSelectAll = () => {
        updateSection({
            ...section,
            selectionMode: "all",
            randomQuestionCount: undefined
        })
    }

    const handleSelectRandom = () => {
        updateSection({
            ...section,
            selectionMode: "random",
            randomQuestionCount: 1
        })
    }

    const moveQuestion = (question: IQuestion, direction: "up" | "down") => {
        const index = section.questions.indexOf(question)
        const newIndex = direction === "up" ? index - 1 : index + 1
        const newQuestions = [...section.questions]
        newQuestions.splice(index, 1)
        newQuestions.splice(newIndex, 0, question)
        updateSection({
            ...section,
            questions: newQuestions
        })
    }

    return (
        <div className="flex flex-col gap-8">
            <div className="mt-4 rounded-lg">
                <div className="space-y-4">
                    <Card
                        onSelect={handleSelectAll}
                        isSelected={section.selectionMode === "all"}
                    >
                        <h3 className="font-semibold">📜 Incluir todas as questões</h3>
                        <p className="text-gray-600 text-sm">Adicione todas as questões desta seção na prova dos alunos.</p>
                        {section.selectionMode === "all" && (
                            <div className="text-sm flex items-center gap-2 mt-2">
                                <input
                                    id="shuffle"
                                    type="checkbox"
                                    className="cursor-pointer"
                                />
                                <label className="cursor-pointer" htmlFor="shuffle">Embaralhar questões para cada aluno</label>
                            </div>
                        )}
                    </Card>

                    <Card
                        onSelect={handleSelectRandom}
                        isSelected={section.selectionMode === "random"}
                    >
                        <h3 className="font-semibold">🎲 Sortear um número de questões</h3>
                        <p className="text-gray-600 text-sm">Escolha quantas questões serão sorteadas para cada aluno.</p>
                        {section.selectionMode === "random" && (
                            <div>
                                <Input
                                    type="number"
                                    min={1}
                                    max={section.questions.length}
                                    className="bg-white mt-2 p-2 border rounded w-52"
                                    placeholder="Número de questões"
                                />
                                <p className="text-xs mt-2 text-gray-800">Max: {section.questions.length}</p>
                            </div>
                        )}
                    </Card>
                </div>
                {
                    false && (
                        <div>
                            Sortear <input type="number" className="w-16 h-8 border border-neutral-300 rounded-lg px-2" defaultValue={section.questions.length} max={section.questions.length} /> questões
                        </div>
                    )
                }
            </div>
            <Separator />
            <div className="flex gap-2">
                <Button
                    onClick={() => setOpen(true)}
                    className="bg-verdigris-400 hover:bg-verdigris-300"
                >
                    <MdAutorenew /> Trocar / Adicionar questões
                </Button>
            </div>
            <div className="flex flex-col gap-10">
                {section.questions.map((question, index) => (
                    <div key={question.id} className="relative">
                        <div className="flex gap-2">
                            <p className="mt-3">{index + 1}. </p>
                            <ScrollArea
                                key={question.id}
                                className="bg-white mb-2 overflow-auto px-4 py-2 rounded-lg shadow-sm w-full"
                            >
                                <QuestionRenderer key={question.id} question={question} />
                            </ScrollArea>
                            <div className="flex flex-col gap-10">
                                <Button onClick={() => onRemove(question)} className="self-start w-5 h-4 mt-1 cursor-pointer text-xs rounded-full border-neutral-500 bg-neutral-500 text-white">
                                    <IoClose />
                                </Button>
                                <div className="ml-2">
                                    <FaArrowUp
                                        className="mb-2 text-neutral-700 cursor-pointer"
                                        onClick={() => moveQuestion(question, "up")}
                                    />
                                    <FaArrowDown
                                        className="text-neutral-700 cursor-pointer"
                                        onClick={() => moveQuestion(question, "down")}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}