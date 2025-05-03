import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { FormSection } from "../../new-question-modal";
import MovableItem from "../../movable-item";
import { MinimalTiptapEditor } from "../../minimal-tiptap";
import { Button } from "../../ui/button";
import { Option } from "@/lib/multiple-choice-question";

type OptionProps = {
  options: Option[];
  setOptions: Dispatch<SetStateAction<Option[]>>;
  answer: string;
  setAnswer: (answer: string) => void;
};

export default function Options({ options, setOptions, answer, setAnswer }: OptionProps) {
  const [focusedOption, setFocusedOption] = useState<number | undefined>();

  return (
    <FormSection>
      <p className="text-sm mb-4">Alternativas</p>
      <div className="flex flex-col gap-2">
        {options.map((option, index) => (
          <MovableItem<Option>
            key={option.id}
            index={index}
            list={options}
            setList={setOptions}
          >
            <input
              className="cursor-pointer"
              name="option"
              type="radio"
              value={option.id}
              onChange={(e) => setAnswer(e.target.value)}
              checked={option.id === answer}
            />
            <MinimalTiptapEditor
              key={option.id} // Add unique key prop here
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
            setOptions([
              ...options,
              new Option(""),
            ]);
          }}
        >
          Adicionar alternativa
        </Button>
      </div>
    </FormSection>
  );
}
