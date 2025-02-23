import { Button } from "@/app/components/ui/button";
import { MdAutorenew } from "react-icons/md";
import { IoClose } from "react-icons/io5";
import QuestionRenderer from "@/app/components/question-renderer";
import { IQuestion } from "@/lib/types";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { Separator } from "@/app/components/ui/separator";
import { Input } from "@/app/components/ui/input";
import { FaArrowDown, FaArrowUp } from "react-icons/fa";
import { Section, useCreateTest } from "@/app/context/create-test-context";
import { memo } from "react";

type SectionQuestionsProps = {
    section: Section;
    setOpen: (open: boolean) => void;
    onRemove: (question: IQuestion) => void;
}

const Card = memo(({ children, onSelect, isSelected }: { children: React.ReactNode, onSelect: () => void, isSelected: boolean }) => (
    <div
        onClick={onSelect}
        className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-500 hover:bg-blue-100 ${isSelected ? "bg-green-100 border-green-500 hover:bg-green-100 hover:border-green-500" : "border-gray-300 "}`}
    >
        {children}
    </div>
))

export default function SectionQuestions({ section, setOpen, onRemove }: SectionQuestionsProps) {
    const { updateSection, moveQuestion } = useCreateTest()

    const handleSelectAll = () => {
        if (section.selectionMode === "all") return
        updateSection({
            ...section,
            selectionMode: "all",
        }, 'handleSelectAll - sectionQuestions')
    }

    const handleSelectRandom = () => {
        if (section.selectionMode === "random") return
        updateSection({
            ...section,
            selectionMode: "random",
            randomQuestionCount: section.randomQuestionCount || 1
        }, 'handleSelectRandom - sectionQuestions')
    }

    const handleShuffle = () => {
        updateSection({
            ...section,
            shuffle: !section.shuffle
        }, 'handleShuffle - sectionQuestions')
    }

    const handleSetRandomQuestionCount = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (Number(e.target.value) > section.questions.length || Number(e.target.value) < 1) return

        updateSection({
            ...section,
            randomQuestionCount: Number(e.target.value)
        }, 'handleSetRandomQuestionCount - sectionQuestions')
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
                                    checked={section.shuffle}
                                    onChange={handleShuffle}
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
                                    value={section.randomQuestionCount}
                                    onChange={handleSetRandomQuestionCount}
                                    onClick={(e) => e.stopPropagation()}
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
                                        onClick={() => moveQuestion(section, question, "up")}
                                    />
                                    <FaArrowDown
                                        className="text-neutral-700 cursor-pointer"
                                        onClick={() => moveQuestion(section, question, "down")}
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