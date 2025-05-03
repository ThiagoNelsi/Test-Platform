import { MultipleChoiceQuestionData } from "@/lib/multiple-choice-question";
import { Separator } from "../../ui/separator";

export default function MultipleChoiceRenderer({
  content,
}: {
  content: MultipleChoiceQuestionData;
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
        {options &&
          options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="radio"
                checked={option.id === content.answer}
                onChange={() => {}}
              />
              <div
                className="whitespaces-pre-wrap"
                dangerouslySetInnerHTML={{ __html: option.value || "" }}
              />
            </div>
          ))}
      </div>
    </div>
  );
}
