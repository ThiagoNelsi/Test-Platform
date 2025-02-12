"use client"

import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { ReactNode } from "react";
import { createQuestion } from "@/lib/questionService";
import { toast } from "sonner";
import QuestionEditor from "./QuestionEditor";
import { useQuestionEditor } from "../context/QuestionEditorContext";
import { valitadeMultipleChoice } from "./QuestionTypes/MultipleChoice/utils";

type NewQuestionModalProps = { }

export const FormSection = ({ children }: { children: ReactNode }) => (
    <div className="border-l-2 border-gray-200 pl-4">
        {children}
    </div>
)

export default function NewQuestionModal({}: NewQuestionModalProps) {
    const { data } = useQuestionEditor()

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()

        const { errors, ...validatedData } = valitadeMultipleChoice(data)

        if (errors) {
            toast.error("- " + errors.join("\n- "), {
                position: "top-center",
                duration: 3000,
                style: {
                    background: "#ef4444", // --red-500
                    color: '#fff',
                    border: 0,
                }
            })
            return
        }

        const formData = new FormData()
        formData.append('type', e.currentTarget.type.value)
        formData.append('level', e.currentTarget.level.value)
        formData.append('data', JSON.stringify(validatedData))

        const res = await createQuestion(formData)

        if (!res) {
            toast.error('Erro ao criar questão', {
                position: "top-center",
                style: {
                    background: "#ef4444", // --red-500
                    color: '#fff',
                    border: 0
                }
            })
            return
        }

        toast.success('Questão criada com sucesso', {
            position: "top-center",
            style: {
                background: "#10b981", // --green-500
                color: '#fff',
                border: 0
            }
        })
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
                submitButtonText="Criar questão"
            />
        </DialogContent>
    )
}
