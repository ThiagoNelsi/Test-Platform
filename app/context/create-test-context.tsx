import { IQuestion, Tag } from "@/lib/types";
import { createContext, Dispatch, ReactNode, SetStateAction, useContext, useState } from "react";

export type Section = {
    id: string;
    shuffle: boolean;
    questions: IQuestion[];
    selectionMode?: "all" | "random";
    randomQuestionCount?: number;
};

type CreateTestContextType = {
    tags: Tag[] | null;
    questions: IQuestion[] | null;
    setQuestions: Dispatch<SetStateAction<IQuestion[]>>;
    addSection: () => void;
    removeSection: (section: Section) => void;
    updateSection: (section: Section, caller: string) => void;
    moveSection: (section: Section, direction: "up" | "down") => void;
    sections: Section[];
    allocatedQuestions: Map<number, string>;
    setAllocatedQuestions: (allocatedQuestion: Map<number, string>) => void;
    addQuestion: (section: Section, question: IQuestion) => void;
    removeQuestion: (section: Section, question: IQuestion) => void;
    moveQuestion: (section: Section, question: IQuestion, direction: "up" | "down") => void;
}

type CreateTestProviderProps = {
    tags: Tag[] | null;
    questions: IQuestion[] | null;
    setQuestions: Dispatch<SetStateAction<IQuestion[]>>;
    children: ReactNode;
}

export const CreateTestContext = createContext<CreateTestContextType>({} as CreateTestContextType);

export const CreateTestProvider = ({ tags, questions, setQuestions, children }: CreateTestProviderProps) => {
    const createEmptySection = (): Section => ({
        id: Math.random().toString(),
        shuffle: false,
        questions: [] as IQuestion[],
        selectionMode: "all"
    })

    const [allocatedQuestions, setAllocatedQuestions] = useState(new Map<number, string>())

    const [sections, setSections] = useState<Section[]>([createEmptySection()])

    const addSection = () => {
        setSections([...sections, createEmptySection()])
    }

    const updateSection = (section: Section, caller: string) => {
        console.log(caller)
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
        }, 'addQuestion')
    }

    const removeQuestion = (section: Section, question: IQuestion) => {
        allocatedQuestions.delete(question.id)
        section.questions = section.questions.filter(q => q.id !== question.id)
        updateSection(section, 'removeQuestion')
    }

    const moveQuestion = (section: Section, question: IQuestion, direction: "up" | "down") => {
        const index = section.questions.indexOf(question)
        const newIndex = direction === "up" ? index - 1 : index + 1
        const newQuestions = [...section.questions]
        newQuestions.splice(index, 1)
        newQuestions.splice(newIndex, 0, question)
        updateSection({
            ...section,
            questions: newQuestions
        }, 'moveQuestion')
    }

    const contextValue: CreateTestContextType = {
        tags,
        allocatedQuestions, setAllocatedQuestions,
        sections, addSection, updateSection, removeSection, moveSection,
        questions, setQuestions, moveQuestion, addQuestion, removeQuestion,
    }


    return (
        <CreateTestContext.Provider value={contextValue}>
            {children}
        </CreateTestContext.Provider>
    )
}

export const useCreateTest = () => {
    return useContext(CreateTestContext)
}