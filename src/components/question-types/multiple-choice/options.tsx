import { Dispatch, SetStateAction, useState } from "react";
import MovableItem from "../../movable-item";
import { MinimalTiptapEditor } from "../../minimal-tiptap";
import { Button } from "../../ui/button";
import { Option } from "@/lib/multiple-choice-question";
import { AlphabeticalRadioGroup } from "../../alphabetical-radio-input/radio-group";
import { AlphabeticalRadioItem } from "../../alphabetical-radio-input/radio-item";

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
      <AlphabeticalRadioGroup
        value={answer || ""}
        onValueChange={setAnswer}
      >
        {options.map((option, index) => (
          <MovableItem<Option>
            key={option.id}
            index={index}
            list={options}
            setList={setOptions}
          >
            <AlphabeticalRadioItem
              value={option.id}
              index={index}
            />
            <MinimalTiptapEditor
              key={option.id} // Add unique key prop here
              placeholder="Digite a alternativa..."
              className={`flex-1 ${
                answer === option.id
                  ? "border-2 border-green-700 focus-within:border-green-700"
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
      </AlphabeticalRadioGroup>
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
