"use client"

import { getTags } from "@/lib/tag-service";
import { useEffect, useState } from "react";
import { IQuestion, Tag } from "@/lib/types";
import { getQuestions } from "@/lib/question-service";
import { QuestionFactory } from "@/lib/question";
import { CreateTestProvider } from "@/app/context/create-test-context";
import CreateTestForm from "./create-test-form";

export default function CreateTest() {
    const [tags, setTags] = useState<Tag[] | null>(null)
    const [questions, setQuestions] = useState<IQuestion[] | null>(null)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        getTags().then(tags => setTags(tags))
        getQuestions().then(questions => setQuestions(QuestionFactory.from(questions)))
    }

    return (
        <CreateTestProvider tags={tags} questions={questions} setQuestions={setQuestions}>
            <CreateTestForm />
        </CreateTestProvider>
    );
}