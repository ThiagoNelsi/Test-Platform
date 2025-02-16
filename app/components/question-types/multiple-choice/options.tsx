import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { FormSection } from "../../new-question-modal";
import MovableItem from "../../movable-item";
import { MinimalTiptapEditor } from "../../minimal-tiptap";
import { Button } from "../../ui/button";
import { MultipleChoiceQuestion } from "@/app/types";

export type Option = MultipleChoiceQuestion['options'][0] & { id: string };

type OptionProps = {
    options: Option[];
    setOptions: Dispatch<SetStateAction<Option[]>>;
}

export default function Options({ options, setOptions }: OptionProps) {
    const [focusedOption, setFocusedOption] = useState<number | undefined>();

    useEffect(() => {
        options.forEach(option => {
            if (!option.id) option.id = Math.random().toString();
        })
    }, [options])

    if (options.some(option => !option.id)) return null

    return (
        <FormSection>
            <p className="text-sm mb-4">Alternativas</p>
            <div className="flex flex-col gap-2">
                {options.map((option, index) => (
                    <MovableItem<Option> key={`${option.id}`} index={index} list={options} setList={setOptions}>
                        <input
                            className="cursor-pointer"
                            name="option"
                            type="radio"
                            onChange={(e) => {
                                const newOptions = [...options];
                                newOptions.forEach((option) => option.isCorrect = false);
                                newOptions[index].isCorrect = e.target.checked;
                                setOptions(newOptions);
                            }}
                            checked={option.isCorrect}
                        />
                        <MinimalTiptapEditor
                            key={`${option.id}`} // Add unique key prop here
                            placeholder="Digite a alternativa..."
                            onFocus={() => setFocusedOption(index)}
                            showToolbar={focusedOption === index}
                            content={option.value}
                            onChange={(content) => {
                                const newOptions = [...options];
                                newOptions[index].value = content as string;
                                setOptions(newOptions);
                            }}

                        />
                    </MovableItem>
                ))}
                <Button
                    className="text-sm w-fit mt-5 ml-5 bg-verdigris"
                    disabled={options[options.length - 1].value === ""}
                    onClick={(e) => {
                        e.preventDefault();
                        setOptions([...options, { value: "", isCorrect: false, id: Math.random().toString() }]);
                    }}
                >
                    Adicionar alternativa
                </Button>
            </div>
        </FormSection>
    )
}