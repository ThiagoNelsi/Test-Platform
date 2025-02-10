import { AutosizeTextarea } from "@/app/components/ui/auto-resize-textarea";
import { HoverCardContent, HoverCardTrigger } from "@/app/components/ui/hover-card";
import { Input } from "@/app/components/ui/input";
import { Separator } from "@/app/components/ui/separator";
import { HoverCard } from "@radix-ui/react-hover-card";
import React, { Dispatch, SetStateAction, useEffect, useState } from "react";
import { MdAdd } from "react-icons/md";
import { FiType } from "react-icons/fi";
import { FaArrowDown, FaArrowUp, FaImage, FaTrash } from "react-icons/fa";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Button } from "@/app/components/ui/button";
import { FormSection } from "./NewQuestionModal";
import { useQuestionData } from "@/app/context/QuestionDataContext";

type StatementTypes = "text" | "image";

type Statement = {
    type: "text" | "image";
    value: string;
}

type Option = {
    value: string;
    isCorrect: boolean;
}

type SectionProps = {
    statementState: Statement[];
    setStatement: Dispatch<SetStateAction<Statement[]>>;
    index: number;
    children: React.ReactNode;
}

type StatementProps = {
    statement: Statement[];
    setStatement: Dispatch<SetStateAction<Statement[]>>;
}

type OptionProps = {
    options: Option[];
    setOptions: Dispatch<SetStateAction<Option[]>>;
}

type MovableItemProps = {
    children: React.ReactNode;
    index: number;
    list: any[];
    setList: Dispatch<SetStateAction<any[]>>;
}

const MovableItem = ({ children, index, list, setList }: MovableItemProps) => {
    const handleMoveSection = (event: React.MouseEvent<SVGElement, MouseEvent>, index: number, direction: "up" | "down") => {
        event.preventDefault();
        const newStatement = [...list];
        const movedItem = newStatement.splice(index, 1)[0];
        newStatement.splice(direction === "up" ? index - 1 : index + 1, 0, movedItem);
        setList(newStatement);
    }

    return (
        <div className="flex items-center gap-2">
            {children}
            <div className="text-sm text-neutral-700">
                <FaArrowUp
                    className="mb-2 hover:text-neutral-900 cursor-pointer"
                    onClick={(e) => handleMoveSection(e, index, "up")}
                />
                <FaArrowDown
                    className="hover:text-neutral-900 cursor-pointer"
                    onClick={(e) => handleMoveSection(e, index, "down")}
                />
            </div>
        </div>
    )
}

const ImageInput = ({ statementState, setStatement, index }: Omit<SectionProps, 'children'>) => {
    return (
        <div className="flex-1">
            <Input 
                onChange={(e) => {
                    const newStatement = [...statementState];
                    newStatement[index].value = e.target.value;
                    setStatement(newStatement);
                }}
                value={statementState[index].value}
            />
            {statementState[index].value && (
                <img src={statementState[index].value} alt="Imagem" className="w-40 h-40 object-cover mt-2" />
            )}
        </div>
    )
}

const Section = ({ statementState, setStatement, index, children }: SectionProps) => {
    const handleNewSection = (event: React.MouseEvent<HTMLButtonElement>, type: StatementTypes, index: number) => {
        event.preventDefault();
        const newStatement = [...statementState];
        newStatement.splice(index + 1, 0, { type, value: "" });
        setStatement(newStatement);
    }

    const handleRemoveSection = (event: React.MouseEvent<HTMLButtonElement>, index: number) => {
        event.preventDefault();
        const newStatement = statementState.filter((_, i) => i !== index);
        setStatement(newStatement);
    }

    return (
        <div className="py-2">
            <MovableItem index={index} list={statementState} setList={setStatement}>
                {children}
            </MovableItem>
            <div className="flex items-center gap-5 mt-2">
                <HoverCard openDelay={50}>
                    <HoverCardTrigger className="flex items-center gap-1 text-xs py-2 cursor-pointer">
                        <MdAdd /> Adicionar seção
                    </HoverCardTrigger>
                    <HoverCardContent align='start' className="flex text-sm gap-2">
                        <button
                            className="flex items-center gap-2 text-gray-500 hover:text-gray-800"
                            onClick={(e) => handleNewSection(e, "text", index)}
                        >
                            <FiType /> Texto
                        </button>
                        <Separator orientation="vertical" className="h-5 bg-gray-500 mx-3" />
                        <button
                            className="flex items-center gap-2 text-gray-500 hover:text-gray-800"
                            onClick={(e) => handleNewSection(e, "image", index)}
                        >
                            <FaImage /> Imagem
                        </button>
                    </HoverCardContent>
                </HoverCard>
                <button 
                    className="flex items-center gap-1 text-xs text-red-500"
                    onClick={(e) => handleRemoveSection(e, index)}
                >
                    <FaTrash className="" /> Remover
                </button>
            </div>
        </div>
    )
}

const Statement = ({ statement, setStatement }: StatementProps) => {
    if (!statement.length) {
        setStatement([{ type: "text", value: "" }]);
    }

    return (
        <FormSection>
            <p className="text-sm mb-2">Enunciado</p>
            {statement.map((item, index) => (
            <Section key={index} statementState={statement} setStatement={setStatement} index={index}>
                {item.type === "text" 
                    ? <AutosizeTextarea 
                        onChange={(e) => {
                            const newStatement = [...statement];
                            newStatement[index].value = e.target.value;
                            setStatement(newStatement);
                        }}
                        value={item.value}
                        />
                    : <ImageInput statementState={statement} setStatement={setStatement} index={index} />}
            </Section>
            ))}
        </FormSection>
    )
}

const Options = ({ options, setOptions }: OptionProps) => {
    return (
        <FormSection>
            <p className="text-sm mb-2">Alternativas</p>
            <div className="flex flex-col gap-2">
                {options.map((option, index) => (
                    <MovableItem key={index} index={index} list={options} setList={setOptions}>
                        <input
                            className="cursor-pointer"
                            name="option"
                            type="radio"
                            onChange={(e) => {
                                const newOptions = [...options];
                                newOptions[index].isCorrect = e.target.checked;
                                setOptions(newOptions);
                            }}
                            checked={option.isCorrect}
                        />
                        <AutosizeTextarea
                            placeholder="Digite o texto da alternativa..."
                            onChange={(e) => {
                                const newOptions = [...options];
                                newOptions[index].value = e.target.value;
                                setOptions(newOptions);
                            }}
                            value={option.value}
                        />
                    </MovableItem>
                ))}
                <Button
                    className="text-sm w-fit mt-5 ml-5 bg-verdigris"
                    onClick={(e) => {
                        e.preventDefault();
                        setOptions([...options, { value: "", isCorrect: false }]);
                    }}
                >
                    Adicionar alternativa
                </Button>
            </div>
        </FormSection>
    )
}

export default function MultipleChoiceForm() {
    const { setData } = useQuestionData();

    const [statement, setStatement] = useState<Statement[]>([
        {
            type: "text",
            value: ""
        },
    ]);

    const [options, setOptions] = useState<Option[]>([
        {
            value: "",
            isCorrect: false
        }
    ]);

    useEffect(() => {
        setData({ statement, options });
    }, [statement, options]);

    return (
        <Tabs defaultValue="editor">
            <TabsList className="flex mb-5">
                <TabsTrigger className="w-full" value="editor">Editor</TabsTrigger>
                <TabsTrigger className="w-full" value="result">Resultado</TabsTrigger>
            </TabsList>
            <TabsContent value="editor" className="flex flex-col gap-10">
                <Statement statement={statement} setStatement={setStatement} />
                <Options options={options} setOptions={setOptions} />
            </TabsContent>
            <TabsContent value="result">
                <div className="flex flex-col gap-5">
                    <p className="font-medium text-sm">Enunciado</p>
                    {statement.map((item, index) => (
                        <div key={index} className="flex flex-col gap-2">
                            {item.type === "text" 
                                ? <p>{item.value}</p> 
                                : <img src={item.value} alt="Imagem" className="object-cover" />
                            }
                        </div>
                    ))}
                </div>
                <Separator className="my-5" />
                <p className="font-medium text-sm mb-5">Alternativas</p>
                <div className="flex flex-col gap-2">
                    {options.map((option, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <input type="checkbox" checked={option.isCorrect} onChange={() => {}} />
                            <p className={`${option.isCorrect && 'text-green-500'}`}>{option.value}</p>
                        </div>
                    ))}
                </div>
            </TabsContent>
        </Tabs>
    )
}