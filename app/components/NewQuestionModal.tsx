"use client"

import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { ReactNode } from "react";
import { createQuestion, updateQuestion } from "@/lib/questionService";
import QuestionEditor from "./QuestionEditor";
import { useQuestionEditor } from "../context/QuestionEditorContext";
import { valitadeMultipleChoice } from "./QuestionTypes/MultipleChoice/utils";
import { errorToast, successToast } from "@/lib/toasters";

type NewQuestionModalProps = {
    type: "create" | "edit"
}

export const FormSection = ({ children }: { children: ReactNode }) => (
    <div className="border-l-2 border-gray-200 pl-4">
        {children}
    </div>
)

export default function NewQuestionModal({ type }: NewQuestionModalProps) {
    const { data, id } = useQuestionEditor()

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()

        const { errors, ...validatedData } = valitadeMultipleChoice(data)

        if (errors) {
            return errorToast("- " + errors.join("\n- "))
        }

        const formData = new FormData()
        formData.append('type', e.currentTarget.type.value)
        formData.append('level', e.currentTarget.level.value)
        formData.append('data', JSON.stringify(validatedData))

        let res = null
        let messageWord = "criar"

        if (type === "create") {
            res = await createQuestion(formData)
        } else {
            messageWord = "editada"
            if (!id) return errorToast("Erro ao editar questão")
            res = await updateQuestion(id, formData)
        }

        if (!res) {
            return errorToast(`Erro ao ${messageWord} questão`)
        }

        successToast(`Questão ${messageWord} com sucesso`)
    }

    return (
        <DialogContent className="max-h-[95vh] md:max-w-[1000px] overflow-auto">
            <DialogHeader>
                <DialogTitle>Criar questão</DialogTitle>
                <DialogDescription>
                    Preencha os campos abaixo para criar uma nova questão.
                </DialogDescription>
            </DialogHeader>
            <QuestionEditor
                submitAction={handleSubmit}
                submitButtonText={type === "create" ? "Criar questão" : "Editar questão"}
            />
        </DialogContent>
    )
}
