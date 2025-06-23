import { Card, CardContent } from "@/app/components/ui/card";
import { Checkbox } from "../../ui/checkbox";
import { Badge } from "../../ui/badge";
import { ChevronDown } from "lucide-react";
import { MultipleChoiceQuestion } from "@/lib/multiple-choice-question";
import { alphabet } from "@/lib/alphabet";
import { getLevel } from "@/lib/levels";
import { tagColors } from "@/lib/tag-colors";

type Props = {
  children?: React.ReactNode;
  question: MultipleChoiceQuestion;
  checkable?: boolean;
  checked?: boolean;
  onCheckedChange?: (id: number) => void;
  showTags?: boolean;
  maxHeight?: string;
  alwaysOpen?: boolean;
};

export default function MultipleChoiceCard({
  children,
  question,
  checkable = false,
  checked = false,
  onCheckedChange,
  showTags = false,
  maxHeight = undefined,
  alwaysOpen = false,
}: Props) {
  const { subjects } = question;

  const getMaxHeight = () => {
    return maxHeight ? `max-h-${maxHeight} overflow-y-auto` : "";
  };

  return (
    <Card
      key={question.id}
      className={`h-full overflow-hidden max-w-[80ch] ${
        checked ? "border-primary" : "border-gray-200 dark:border-gray-700"
      }`}
    >
      <CardContent className="h-full flex flex-col justify-between p-6 pb-2">
        {/* Header */}
        <div className="flex items-start gap-3">
          {checkable && (
            <Checkbox
              id={`select-question-${question.id}`}
              checked={checked}
              onCheckedChange={() => onCheckedChange?.(question.id)}
              className="mt-1"
            />
          )}
          <div className="flex-1">
            <div className="flex flex-wrap gap-2 mb-2">
              {question.source !== "MANUAL" && (
                <Badge className="bg-primary">
                  {question.source === "AI" ? "IA" : question.source}
                </Badge>
              )}

              {question.level != null && question.level >= 0 && (
                <Badge variant="outline">{getLevel(question.level)}</Badge>
              )}

              {question.subjects.map((subjectId) => {
                const subject = subjects.find((s) => s === subjectId);
                return subject ? (
                  <Badge key={subject} variant="outline">
                    {subject}
                  </Badge>
                ) : null;
              })}

              {showTags &&
                question.tags.map((tag, index) => {
                  return tag ? (
                    <Badge
                      key={String(question.id) + tag.id}
                      variant="outline"
                      className="border-0 font-normal"
                      style={{
                        backgroundColor: tagColors[tag.color].background,
                        color: tagColors[tag.color].text,
                      }}
                    >
                      {tag.name}
                    </Badge>
                  ) : null;
                })}
            </div>
          </div>
        </div>

        {/* Content */}
        <div
          className={`w-full text-xs h-full overflow-hidden px-2 mb-4 ${getMaxHeight()}`}
        >
          {alwaysOpen ? (
            <>
              <Statement statement={question.content.statement} />
              <Options
                options={question.content.options}
                answer={question.content.answer}
              />
            </>
          ) : (
            <details className="group">
              <summary className="flex flex-col gap-4 cursor-pointer list-none justify-center py-2 text-left font-normal">
                <Statement statement={question.content.statement} />
                <div className="flex items-center gap-2 text-xs">
                  <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180" />
                  Ver alternativas
                </div>
              </summary>
              <Options
                options={question.content.options}
                answer={question.content.answer}
              />
            </details>
          )}
        </div>
        <footer className="flex items-center gap-2 border-t pt-2">
          {children}
        </footer>
      </CardContent>
    </Card>
  );
}

function Statement({ statement }: { statement: string }) {
  return (
    <p
      className={`text-left font-normal whitespace-pre-wrap`}
      dangerouslySetInnerHTML={{
        __html: statement,
      }}
    ></p>
  );
}

function Options({
  options,
  answer,
}: {
  options: MultipleChoiceQuestion["content"]["options"];
  answer: MultipleChoiceQuestion["content"]["answer"];
}) {
  return (
    <div className="mt-4 space-y-2 pb-4">
      {options.map((option, index) => (
        <div key={option.id} className="flex items-center gap-2">
          <div className="w-8">
            <div
              className={`flex items-center justify-center font-medium w-8 h-8 border rounded-full ${
                answer === option.id
                  ? "border-green-300 bg-green-100"
                  : ""
              }`}
            >
              {alphabet[index]}
            </div>
          </div>
          <div
            className="whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: option.value }}
          />
        </div>
      ))}
    </div>
  );
}
