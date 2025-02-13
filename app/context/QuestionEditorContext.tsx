"use client"

import { createContext, ReactNode, useContext, useState } from "react";
import { QuestionType } from "../types";

type EditorContextType = {
    id: number | undefined;
    setId: (id: number) => void;
    initialData: any;
    setInitialData: (data: any) => void;
    data: any;
    setData: (data: any) => void;
    level: number;
    setLevel: (level: number) => void;
    type: QuestionType;
    setType: (type: QuestionType) => void;
}

const QuestionEditorContext = createContext<EditorContextType | undefined>(undefined)

export const QuestionEditorProvider = ({ children }: { children: ReactNode }) => {
    const [id, setId] = useState<number | undefined>(undefined);
    const [initialData, setInitialData] = useState<any>(undefined);
    const [data, setData] = useState<any>(undefined);
    const [level, setLevel] = useState<number>(-1);
    const [type, setType] = useState<QuestionType>("multiple_choice")

    return (
        <QuestionEditorContext.Provider value={{
            id,
            setId,
            initialData,
            setInitialData,
            data,
            setData,
            level,
            setLevel,
            type,
            setType
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