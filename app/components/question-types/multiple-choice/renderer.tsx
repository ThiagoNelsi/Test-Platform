import { MultipleChoiceQuestionContent } from "@/lib/multiple-choice-question";
import { Separator } from "../../ui/separator";
import { AlphabeticalRadioGroup } from "../../alphabetical-radio-input/radio-group";
import { AlphabeticalRadioItem } from "../../alphabetical-radio-input/radio-item";

export default function MultipleChoiceRenderer({
  content,
}: {
  content: MultipleChoiceQuestionContent;
}) {
  const { statement, options } = content;

  return (
    <div className="p-1">
      <div className="flex flex-col gap-5">
        <div
          className="whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: statement }}
        />
      </div>
      <Separator className="my-5" />
      <div className="flex flex-col gap-2">
        <AlphabeticalRadioGroup
          value={content.answer}
          onValueChange={(value) => {}}
          viewOnly
        >
          {options && options.map((option, index) => (
            <AlphabeticalRadioItem
              key={option.id}
              value={option.id}
              innerHTML={option.value || ""}
            />
          ))}
        </AlphabeticalRadioGroup>
      </div>
    </div>
  );
}
