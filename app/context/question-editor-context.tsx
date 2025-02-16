"use client"

import { createContext, ReactNode, useContext, useState } from "react";
import { QuestionType, Tag } from "../types";

type EditorContextType = {
    id: number | undefined;
    setId: (id: number) => void;
    data: any;
    setData: (data: any) => void;
    level: number;
    setLevel: (level: number) => void;
    type: QuestionType;
    setType: (type: QuestionType) => void;
    tags: Tag[];
    setTags: (tags: Tag[]) => void;
}

const QuestionEditorContext = createContext<EditorContextType | undefined>(undefined)

export const QuestionEditorProvider = ({ children }: { children: ReactNode }) => {
    const [id, setId] = useState<number | undefined>(undefined);
    const [data, setData] = useState<any>(undefined);
    const [level, setLevel] = useState<number>(-1);
    const [type, setType] = useState<QuestionType>("multiple_choice")
    const [tags, setTags] = useState<Tag[]>([])

    return (
        <QuestionEditorContext.Provider value={{
            id,
            setId,
            data,
            setData,
            level,
            setLevel,
            type,
            setType,
            tags,
            setTags
        }}>
            {children}
        </QuestionEditorContext.Provider>
    )
}

export const useQuestionEditor = () => {
    const context = useContext(QuestionEditorContext)
    if (!context) {
        throw new Error("useQuestionEditor must be used within a QuestionEditorProvider")
    }
    return context
}