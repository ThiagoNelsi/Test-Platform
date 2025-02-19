"use client"

import { Button } from "@/app/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/app/components/ui/dialog";
import { IQuestion, Tag } from "@/lib/types";
import { useContext, useState } from "react";
import { IoClose } from "react-icons/io5";
import { MdAdd, MdAutorenew } from "react-icons/md";
import { QuestionFinder } from "./question-finder";
import { QuestionSearchbar } from "./questions-searchbar";
import QuestionRenderer from "@/app/components/question-renderer";
import { TestBuilderContext } from "./test-builder";

export type SpecificQuestionsSection = {
    id: string;
    type: "specific";
    shuffle: boolean;
    questions: IQuestion[];
}

type SpecificQuestionsSectionProps = {
    section: SpecificQuestionsSection;
}

export const SpecificQuestionsSection = ({ section }: SpecificQuestionsSectionProps) => {
    const { tags, updateSection } = useContext(TestBuilderContext)

    const [searchTerm, setSearchTerm] = useState<string>("")
    const [selectedTags, setSelectedTags] = useState<Tag[]>([])
    const [open, setOpen] = useState<boolean>(false);

    const handleRemove = (question: IQuestion) => {
        setQuestions(section.questions.filter(q => q.id !== question.id))
    }

    const setQuestions = (questions: IQuestion[]) => {
        updateSection({ ...section, questions })
    }

    if (section.questions.length && !open) {
        return (
            <div className="flex flex-col gap-8">
                <div className="flex gap-2 mt-4">
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
                            <div onClick={() => handleRemove(question)} className="absolute right-5 top-5 cursor-pointer text-lg">
                                <IoClose />
                            </div>
                            <div className="flex gap-2">
                                <p className="mt-1">{index + 1}. </p>
                                <div
                                    key={question.id}
                                    className="mb-2 overflow-auto border-2 p-4 rounded-lg cursor-pointer w-full"
                                >
                                    <QuestionRenderer key={question.id} question={question} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="w-fit my-4 bg-blue-400 hover:bg-blue-500">
                    <MdAdd /> Escolher questões
                </Button>
            </DialogTrigger>
            <DialogContent className="flex flex-col min-w-full h-full">
                <DialogHeader>
                    <DialogTitle>Escolha as questões</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-auto pb-32">
                    <QuestionFinder selected={section.questions} setSelected={setQuestions} searchTerm={searchTerm} selectedTags={selectedTags} />
                </div>

                <footer className="bg-neutral-200 fixed flex flex-col gap-3 bottom-0 left-0 w-full shadow-lg p-4 rounded-b-lg">
                    <QuestionSearchbar
                        tags={tags}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        selectedTags={selectedTags}
                        setSelectedTags={setSelectedTags}
                    />
                    <div className="flex items-center gap-2 justify-between">
                        <p className="font-medium">Questões selecionadas: {section.questions.length}</p>
                        <Button onClick={() => setOpen(false)} className="w-52 bg-verdigris hover:bg-verdigris text-white px-4 py-2 rounded-lg flex items-center gap-2">
                            Pronto
                        </Button>
                    </div>
                </footer>
            </DialogContent>
        </Dialog>
    )
}