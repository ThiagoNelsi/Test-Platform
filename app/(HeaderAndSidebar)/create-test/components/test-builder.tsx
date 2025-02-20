"use client"

import { Button } from "@/app/components/ui/button";
import { IQuestion, Tag } from "@/lib/types";
import { createContext, useEffect, useState } from "react";
import { TestSection } from "./test-section";
import { QuestionSection } from "./question-section";
import { QuestionTags } from "../page";
import SectionQuestions from "./section-questions";

export type Section = {
    id: string;
    shuffle: boolean;
    questions: IQuestion[];
};

type TestBuilderProps = {
    tags: Tag[];
    questionTags: QuestionTags[]
}

type TestBuilderContextType = {
    tags: Tag[];
    updateSection: (section: Section) => void;
    sections: Section[];
    questionTags: QuestionTags[];
    allocatedQuestions: Map<number, string>;
    setAllocatedQuestions: (allocatedQuestion: Map<number, string>) => void;
    removeQuestion: (section: Section, question: IQuestion) => void;
}

export const TestBuilderContext = createContext<TestBuilderContextType>({} as TestBuilderContextType);

const createEmptySection = () => ({
    id: Math.random().toString(),
    shuffle: false,
    questions: [] as IQuestion[]
})

export const TestBuilder = ({ tags, questionTags }: TestBuilderProps) => {
    const [allocatedQuestions, setAllocatedQuestions] = useState(new Map<number, string>())

    const [sections, setSections] = useState<Section[]>([createEmptySection()])

    const addSection = () => {
        setSections([...sections, createEmptySection()])
    }

    const updateSection = (section: Section) => {
        setSections(sections.map(s => s.id === section.id ? section : s))
    }

    const removeSection = (section: Section) => {
        section.questions.forEach(q => {
            allocatedQuestions.delete(q.id)
        })
        setSections(sections.filter(s => s.id !== section.id))
    }

    const removeQuestion = (section: Section, question: IQuestion) => {
        allocatedQuestions.delete(question.id)
        section.questions = section.questions.filter(q => q.id !== question.id)
        updateSection(section)
    }

    const contextValue = { sections, tags, updateSection, questionTags, allocatedQuestions, setAllocatedQuestions, removeQuestion }

    return (
        <TestBuilderContext.Provider value={contextValue}>
            <div className="flex flex-col gap-8">
                {sections.map((section, index) => (
                    <TestSection key={index} number={index + 1} removeSection={() => removeSection(section)}>
                        <QuestionSection section={section} key={index} />
                    </TestSection>
                ))}
                <Button className="w-64 bg-blue-500 hover:bg-blue-600" onClick={addSection}>Nova seção de questões</Button>
            </div>
        </TestBuilderContext.Provider>
    )
}