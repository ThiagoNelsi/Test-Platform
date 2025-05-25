import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { FormSection } from "../../new-question-modal";
import MovableItem from "../../movable-item";
import { MinimalTiptapEditor } from "../../minimal-tiptap";
import { Button } from "../../ui/button";
import { Option } from "@/lib/multiple-choice-question";
import { alphabet } from "@/lib/alphabet";

type OptionProps = {
  options: Option[];
  setOptions: Dispatch<SetStateAction<Option[]>>;
  answer: string;
  setAnswer: (answer: string) => void;
};

export default function Options({
  options,
  setOptions,
  answer,
  setAnswer,
}: OptionProps) {
  const [focusedOption, setFocusedOption] = useState<number | undefined>();

  return (
    <div className="flex flex-col gap-2">
      {options.map((option, index) => (
        <MovableItem<Option>
          key={option.id}
          index={index}
          list={options}
          setList={setOptions}
        >
          <div className="w-8">
            <div
              className={`flex items-center justify-center font-medium w-8 h-8 border rounded-full cursor-pointer ${
                answer === option.id
                  ? "border-green-900 bg-green-800 text-white"
                  : ""
              }`}
              onClick={() => {
                setAnswer(option.id);
              }}
            >
              {alphabet[index]}
            </div>
          </div>
          <MinimalTiptapEditor
            key={option.id} // Add unique key prop here
            placeholder="Digite a alternativa..."
            className={`flex-1 ${
              answer === option.id
                ? "border-2 border-green-800 focus-within:border-green-800"
                : ""
            }`}
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
          setOptions([...options, new Option("")]);
        }}
      >
        Adicionar alternativa
      </Button>
    </div>
  );
}
