"use client"

import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import MultipleChoiceForm from "./MultipleChoiceForm";
import { Button } from "@/app/components/ui/button";
import { ReactNode } from "react";
import { QuestionType } from "@/app/types";
import { useQuestionData } from "@/app/context/QuestionDataContext";
import { createQuestion } from "@/lib/questionService";
import { toast } from "sonner";

type NewQuestionModalProps = { }

export const FormSection = ({ children }: { children: ReactNode }) => (
    <div className="border-l-2 border-gray-200 pl-4">
        {children}
    </div>
)

export default function NewQuestionModal({ }: NewQuestionModalProps) {
    const { type, setType, data } = useQuestionData()

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()

        const formData = new FormData()
        formData.append('type', type)
        formData.append('level', e.currentTarget.level.value)
        formData.append('data', JSON.stringify(data))

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
        <DialogContent className="max-h-[90vh] md:min-w-[700px] overflow-auto">
            <DialogHeader>
                <DialogTitle>Criar questão</DialogTitle>
                <DialogDescription>
                    Preencha os campos abaixo para criar uma nova questão.
                </DialogDescription>
            </DialogHeader>
            <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
                <div className="flex flex-col gap-10 ">
                    <FormSection>
                        <p className="text-sm mb-2">Tipo</p>
                        <Select required defaultValue={type} onValueChange={(value: string) => setType(value as QuestionType)}>
                            <SelectTrigger className="w-fit">
                                <SelectValue placeholder="Selecione um tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="multiple_choice">Múltipla escolha</SelectItem>
                            </SelectContent>
                        </Select>
                    </FormSection>
                    {
                        type === "multiple_choice" && <MultipleChoiceForm />

                    }
                    <FormSection>
                        <p className="text-sm mb-2">Dificuldade</p>
                        <Select name="level">
                            <SelectTrigger className="w-fit">
                                <SelectValue placeholder="Selecione uma dificuldade" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="easy">Fácil</SelectItem>
                                <SelectItem value="medium">Médio</SelectItem>
                                <SelectItem value="hard">Difícil</SelectItem>
                            </SelectContent>
                        </Select>
                    </FormSection>
                </div>
                <Button className="bg-verdigris mt-10" type="submit">Criar questão</Button>
            </form>
        </DialogContent>
    )
}
