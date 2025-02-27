"use client"

import { getTags } from "@/lib/tag-service";
import { useEffect, useState } from "react";
import { IQuestion, Tag, TestData } from "@/lib/types";
import { getQuestions } from "@/lib/question-service";
import { QuestionFactory } from "@/lib/question";
import { CreateTestProvider, Section } from "@/app/context/create-test-context";
import CreateTestForm from "./create-test-form";
import { useSearchParams } from "next/navigation";
import { getTest } from "@/lib/test-service";

type SectionFromServer = {
    shuffle?: boolean;
    questions: {
        questionId: number;
        version: number;
    }[];
    count?: number;
}

export default function CreateTest() {
    const searchParams = useSearchParams()
    const testId = searchParams.get('test')
    const [tags, setTags] = useState<Tag[] | null>(null)
    const [questions, setQuestions] = useState<IQuestion[]>([])
    const [test, setTest] = useState<TestData | null>(null)

    useEffect(() => {
        fetchData()
    }, [])

    useEffect(() => {
        if (!test && questions.length) fetchTest()
    }, [questions])

    const fetchData = async () => {
        getTags().then(tags => setTags(tags))
        const q = await getQuestions()
        setQuestions(QuestionFactory.from(q))
    }

    const fetchTest = async () => {
        if (testId) {
            const t = await getTest(Number(testId))
            if (!t) return;
            setTest({
                id: t.id,
                name: t.name,
                value: t.value,
                description: t.description || "",
                dueDate: t.dueDate || undefined,
                duration: t.timer || 0,
                publishDate: t.publishDate || undefined,
                sections: (t.sections as unknown as SectionFromServer[])?.map<Section>(section => {
                    return {
                        shuffle: section.shuffle || false,
                        questions: section.questions.map(question => {
                            return questions.find(q => q.id === question.questionId)
                        }).filter(q => q !== undefined) as IQuestion[],
                        selectionMode: section.count ? "random" : "all",
                        randomQuestionCount: section.count,
                        id: Math.random().toString()
                    }
                }),
                classroomIds: [(t.classroomId || 0)],
                status: t.status as TestData["status"]
            })
        }
    }

    if (testId && !test) {
        return <div>Loading...</div>
    }

    return (
        <CreateTestProvider tags={tags} questions={questions} setQuestions={setQuestions}>
            <CreateTestForm test={test} />
        </CreateTestProvider>
    );
}