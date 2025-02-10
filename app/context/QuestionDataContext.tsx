"use client"

import { createContext, useContext, useState } from "react";
import { QuestionType } from "../types";

type QuestionDataContextType = {
    data: unknown;
    setData: (data: unknown) => void;
    type: QuestionType;
    setType: (type: QuestionType) => void;
};

const QuestionDataContext = createContext<QuestionDataContextType | undefined>(undefined);

const QuestionDataProvider = ({ children }: { children: React.ReactNode }) => {
    const [data, setData] = useState<unknown>(undefined);
    const [type, setType] = useState<QuestionType>("multiple_choice");

    return (
        <QuestionDataContext.Provider value={{ data, setData, type, setType }}>
            {children}
        </QuestionDataContext.Provider>
    );
};

const useQuestionData = () => {
    const context = useContext(QuestionDataContext);
    if (!context) {
        throw new Error("useQuestionData must be used within a QuestionDataProvider");
    }
    return context;
};

export { QuestionDataProvider, useQuestionData };