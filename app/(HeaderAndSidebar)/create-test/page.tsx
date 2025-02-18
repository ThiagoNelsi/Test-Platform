"use client"

import { RemovableTag } from "@/app/components/removable-tag";
import { AutosizeTextarea } from "@/app/components/ui/auto-resize-textarea";
import { Button } from "@/app/components/ui/button";
import { Command, CommandInput, CommandList } from "@/app/components/ui/command";
import { DatePicker } from "@/app/components/ui/date-picker";
import { Input } from "@/app/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/app/components/ui/select";
import { Tag } from "@/app/types";
import { useState } from "react";
import { IoIosRocket, IoMdStopwatch } from "react-icons/io";
import { MdAdd } from "react-icons/md";
import { SlNote } from "react-icons/sl";

type InputBlockProps = {
    label: string;
    required?: boolean;
    children: React.ReactNode;
};

type RandomQuestionsSection = {
    tag: Tag;
    numberOfQuestions: number;
    questions: number[]
}

type SpecificQuestionsSection = {
    questions: number;
}

type Section = RandomQuestionsSection | SpecificQuestionsSection;

const InputBlock = ({ label, children, required }: InputBlockProps) => (
    <div className="flex flex-col gap-2">
        <label className="text-sm">
            {label}
            {required 
                ? <span className="text-red-500"> *</span>
                : <span className="text-xs"> (opcional)</span>
            }
        </label>
        {children}
    </div>
);

const DurationInput = () => {
    return (
        <div className="flex items-center gap-2 text-xs">
            <IoMdStopwatch className="text-base" />
            <div className="flex gap-2">
                <div>
                    <Input placeholder="Horas" className="bg-white w-24" type="number" min={0} max={99} />
                </div>
                <div>
                    <Input placeholder="Minutos" className="bg-white w-28" type="number" min={0} max={59} />
                </div>
            </div>
        </div>
    )
}

const RandomQuestionsSectionInput = () => {
    const [tag, setTag] = useState<Tag | null>(null);
    const [numberOfQuestions, setNumberOfQuestions] = useState<number>();

    return (
        <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2 items-center">
                <span>Selecionar</span>
                <Input className="bg-white w-16" type="number" min={1} defaultValue={3} />
                <span>questões de</span>
                {tag
                    ? <RemovableTag tag={tag} onRemove={() => setTag(null)} />
                    : <Select value={tag || undefined} onValueChange={() => setTag(tag)}>
                        <SelectTrigger className="max-w-52 bg-white">
                            Tag {tag}
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">Tag 1</SelectItem>
                            <SelectItem value="2">Tag 2</SelectItem>
                            <SelectItem value="3">Tag 3</SelectItem>
                            <SelectItem value="4">Tag 4</SelectItem>
                            <SelectItem value="5">Tag 5</SelectItem>
                        </SelectContent>
                    </Select>
                }
            </div>
        </div>
    )
}

const QuestionSelector = () => {
    const [sections, setSections] = useState<Section[]>([])´

    return (
        <div>
            <RandomQuestionsSectionInput />
            <Button className="bg-gray-400 hover:bg-gray-500"><MdAdd /> Adicionar questão</Button>
        </div>
    )
}

export default function CreateTest() {
    return (
        <div className="flex flex-col gap-5 max-w-[800px] mx-auto py-6">
            <h1 className="font-semibold">Nova prova</h1>
            <div className="flex flex-col gap-6 bg-gray-100 p-6 rounded-lg">
                <div className="flex gap-10">
                    <div className="flex-[2]">
                        <InputBlock label="Nome da prova" required>
                            <Input className="bg-white" placeholder="Ex.: Prova I do semestre..." />
                        </InputBlock>
                    </div>
                    <div className="flex-[1]">
                        <InputBlock label="Valor" required>
                            <Input className="bg-white" defaultValue={10} type="number" min={0} />
                        </InputBlock>
                    </div>
                </div>
                <div className="flex gap-10">
                    <InputBlock label="Data de entrega">
                        <DatePicker />
                    </InputBlock>
                    <InputBlock label="Duração">
                        <DurationInput />
                    </InputBlock>
                </div>
                <InputBlock label="Descrição / Instrução aos alunos">
                    <AutosizeTextarea placeholder="Descrição da prova..." />
                </InputBlock>
            </div>
            <h1>Questões</h1>
            <div className="flex flex-col gap-6 bg-gray-100 p-6 rounded-lg">
                <QuestionSelector />
            </div>
            <h1>Publicação</h1>
            <div className="flex flex-col gap-6 bg-gray-100 p-6 rounded-lg">
                <div className="flex gap-10">
                    <InputBlock label="Agendar publicação">
                        <DatePicker />
                    </InputBlock>
                </div>
            </div>
            <div className="flex flex-col gap-6">
                <Button className="flex-[3] bg-verdigris hover:bg-verdigris-400"><IoIosRocket /> Publicar</Button>
                <Button className="flex-[1] bg-gray-400 hover:bg-gray-500"><SlNote /> Salvar rascunho</Button>
            </div>
        </div>
    );
}