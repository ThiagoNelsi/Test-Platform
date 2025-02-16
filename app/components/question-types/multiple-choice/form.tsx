import React, { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { FormSection } from "../../new-question-modal";
import { useQuestionEditor } from "../../../context/question-editor-context";
import { MinimalTiptapEditor } from '../../minimal-tiptap'
import { Content } from '@tiptap/react'
import Options, { Option } from "./options";

type Statement = string;

type MultipleChoiceQuestionData = {
    statement: Statement[];
    options: Option[];
}

type MultipleChoiceFormProps = {}

export default function MultipleChoiceForm({}: MultipleChoiceFormProps) {
    const { data, setData } = useQuestionEditor();
    const [isStatementFocused, setIsStatementFocused] = useState(false);

    const editorRef = useRef<HTMLDivElement>(null);

    const setStatement: Dispatch<SetStateAction<Content>> = (newStatement) => {
        setData((prevData: MultipleChoiceQuestionData) => ({
            ...prevData,
            statement: newStatement
        }));
    }

    const setOptions: Dispatch<SetStateAction<Option[]>> = (newOptions) => {
        setData((prevData: MultipleChoiceQuestionData) => ({
            ...prevData,
            options: newOptions
        }));
    }

    useEffect(() => {
        if (!data || data.statement === undefined || data.options === undefined) {
            setData({
                statement: "",
                options: [
                    { value: "", isCorrect: false, id: Math.random().toString() },
                    { value: "", isCorrect: false, id: Math.random().toString() }
                ]
            });
        }
    }, [])

    if (data?.statement === undefined || data?.options === undefined) {
        return null
    }

    return (
        <>
            <FormSection>
                <p className="text-sm mb-2">Enunciado</p>
                <MinimalTiptapEditor
                    autofocus
                    onFocus={() => setIsStatementFocused(true)}
                    ref={editorRef}
                    showToolbar={isStatementFocused}
                    content={data.statement}
                    onChange={(content) => setStatement(content)}
                    placeholder="Digite o enunciado da questão..."
                    className="min-h-72"
                />
            </FormSection>
            <Options options={data.options} setOptions={setOptions} />
        </>
    )
}