"use client"

import { IQuestion, Tag } from "@/lib/types";
import { getQuestions } from "@/lib/questionService";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { QuestionFactory } from "@/lib/question";
import QuestionRenderer from "@/app/components/question-renderer";

type QuestionFinderProps = {
    selected: IQuestion[];
    setSelected: (questions: IQuestion[]) => void;
    maxSelections?: number;
    searchTerm: string;
    selectedTags: Tag[];
}

export const QuestionFinder = ({ selected, setSelected, searchTerm, selectedTags, maxSelections = Infinity }: QuestionFinderProps) => {
    const userId = useSession().data?.user.id
    const [questions, setQuestions] = useState<IQuestion[]>([])
    const [filteredQuestions, setFilteredQuestions] = useState<IQuestion[]>([])

    useEffect(() => {
        fetchQuestions()
    }, [])

    useEffect(() => {
        const filteredByTag = questions.filter((question) => {
            return selectedTags.every((tag) => question.tags.some((t) => t.id === tag.id))
        })
        const filteredBySearch = filteredByTag.filter((question) => {
            return question.getText().toLowerCase().includes(searchTerm.toLowerCase())
        })
        setFilteredQuestions(filteredBySearch)
    }, [searchTerm, selectedTags, questions])

    const fetchQuestions = async () => {
        const res = await getQuestions(userId)
        setQuestions(QuestionFactory.from(res))
    }

    const handleSelect = (question: IQuestion) => {
        if (selected.some(q => q.id === question.id)) {
            setSelected(selected.filter((q) => q.id !== question.id))
            return
        }

        if (maxSelections && selected.length >= maxSelections) return

        setSelected([...selected, question])
    }

    if (questions.length === 0) return <div>Carregando questões...</div>

    return (
        <div className="flex flex-col gap-4">
            <div className="grid gap-10 lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1">
                {filteredQuestions.map((question) => {
                    return (
                        <div
                            key={question.id}
                            onClick={() => handleSelect(question)}
                            className={"h-[500px] overflow-auto border-2 p-4 rounded-lg cursor-pointer hover:shadow-lg" + (selected.some(q => q.id === question.id) ? " border-green-500" : " border-gray-300")}
                        >
                            <QuestionRenderer question={question} />
                        </div>
                    )
                })}
            </div>
        </div>
    )
}