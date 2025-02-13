"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import MultipleChoiceForm from "./QuestionTypes/MultipleChoice/form";
import { Button } from "@/app/components/ui/button";
import { QuestionType } from "@/app/types";
import { FormSection } from "./NewQuestionModal";
import { useQuestionEditor } from "../context/QuestionEditorContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import MultipleChoiceRenderer from "./QuestionTypes/MultipleChoice/renderer";

type QuestionEditorProps = {
    submitAction: (e: React.FormEvent<HTMLFormElement>) => void
    submitButtonText?: string
}

export default function QuestionEditor({ submitAction, submitButtonText }: QuestionEditorProps) {
    const { data, type, setType, level } = useQuestionEditor()

    const levels = ["easy", "medium", "hard"]

    return (
        <form className="flex flex-col gap-2" onSubmit={submitAction}>
            <Tabs defaultValue="editor">
                <TabsList className="flex mb-5">
                    <TabsTrigger className="w-full" value="editor">Editor</TabsTrigger>
                    <TabsTrigger className="w-full" value="result">Resultado</TabsTrigger>
                </TabsList>
                <TabsContent value="editor" className="flex flex-col">
                    <div className="flex flex-col gap-8">
                        <FormSection>
                            <p className="text-sm mb-2">Tipo</p>
                            <Select name="type" required defaultValue={type} onValueChange={(value: string) => setType(value as QuestionType)}>
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
                            <Select name="level" defaultValue={level >= 0 ? levels[level] : undefined}>
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
                </TabsContent>
                <TabsContent value="result">
                    {type === "multiple_choice" && <MultipleChoiceRenderer content={data} />}
                </TabsContent>
            </Tabs>
            <Button className="bg-verdigris hover:bg-verdigris-400 mt-10" type="submit">{submitButtonText}</Button>
        </form>
    )
}