"use client"

import { Button } from "@/app/components/ui/button";
import { IQuestion, Tag } from "@/lib/types";
import { createContext, useEffect, useState } from "react";
import { TestSection } from "./test-section";
import { QuestionSection } from "./question-section";
import { QuestionTags } from "../page";
import SectionQuestions from "./section-questions";
import { MdAdd } from "react-icons/md";

export type Section = {
    id: string;
    shuffle: boolean;
    questions: IQuestion[];
    selectionMode?: "all" | "random";
    randomQuestionCount?: number;
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
    addQuestion: (section: Section, question: IQuestion) => void;
    removeQuestion: (section: Section, question: IQuestion) => void;
}

export const TestBuilderContext = createContext<TestBuilderContextType>({} as TestBuilderContextType);

const createEmptySection = (): Section => ({
    id: Math.random().toString(),
    shuffle: false,
    questions: [] as IQuestion[],
    selectionMode: "all"
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
        if (sections.length === 1) return

        section.questions.forEach(q => {
            allocatedQuestions.delete(q.id)
        })
        setSections(sections.filter(s => s.id !== section.id))
    }

    const moveSection = (section: Section, direction: "up" | "down") => {
        const s = sections.find(s => s.id === section.id)
        const index = s ? sections.indexOf(s) : -1

        const newIndex = direction === "up" ? index - 1 : index + 1
        const newSections = [...sections]
        newSections.splice(index, 1)
        newSections.splice(newIndex, 0, section)
        setSections(newSections)
    }

    const addQuestion = (section: Section, question: IQuestion) => {
        allocatedQuestions.set(question.id, section.id)
        updateSection({
            ...section,
            questions: [...section.questions, question]
        })
    }

    const removeQuestion = (section: Section, question: IQuestion) => {
        allocatedQuestions.delete(question.id)
        section.questions = section.questions.filter(q => q.id !== question.id)
        updateSection(section)
    }

    const contextValue = { sections, tags, updateSection, questionTags, allocatedQuestions, setAllocatedQuestions, removeQuestion, addQuestion }

    return (
        <TestBuilderContext.Provider value={contextValue}>
            <div className="flex flex-col gap-4">
                {sections.map((section, index) => (
                    <TestSection key={section.id} number={index + 1} removeSection={() => removeSection(section)} moveSection={moveSection} section={section}>
                        <QuestionSection section={section} key={index} />
                    </TestSection>
                ))}
                <Button className="w-64 bg-verdigris-400 hover:bg-verdigris-300" onClick={addSection}><MdAdd /> Adicionar seção de questões</Button>
            </div>
        </TestBuilderContext.Provider>
    )
}