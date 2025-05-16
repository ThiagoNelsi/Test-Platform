import { Card, CardContent } from "@/app/components/ui/card";
import { Checkbox } from "../../ui/checkbox";
import { Badge } from "../../ui/badge";
import { ChevronDown } from "lucide-react";
import { MultipleChoiceQuestion } from "@/lib/multiple-choice-question";

type Props = {
  children?: React.ReactNode;
  question: MultipleChoiceQuestion;
  checkable?: boolean;
  checked?: boolean;
  onCheckedChange?: (id: number) => void;
  showTags?: boolean;
  maxHeight?: string;
};

export default function MultipleChoiceCard({
  children,
  question,
  checkable = false,
  checked = false,
  onCheckedChange,
  showTags = false,
  maxHeight = undefined,
}: Props) {
  const { subjects } = question;
  const alphabet = [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
    "Q",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "Z",
  ];

  const getMaxHeight = () => {
    return maxHeight ? `max-h-${maxHeight} overflow-y-auto` : ""
  }

  return (
    <Card key={question.id} className={`overflow-hidden max-w-[80ch] ${
      checked ? "border-primary" : "border-gray-200 dark:border-gray-700"
    }`}>
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
                      className="bg-gray-50 dark:bg-gray-800"
                    >
                      {tag.name}
                    </Badge>
                  ) : null;
                })}

              <Badge className="bg-primary">{question.source === "AI" ? "IA" : question.source}</Badge>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className={`w-full text-xs h-full overflow-hidden px-2 mb-4 ${getMaxHeight()}`}>
          <details className="group">
            <summary className="flex flex-col gap-4 cursor-pointer list-none justify-center py-2 text-left font-normal">
              <p
                className={`text-left font-normal whitespace-pre-wrap`}
                dangerouslySetInnerHTML={{
                  __html: question.data.statement,
                }}
              ></p>
              <div className="flex items-center gap-2 text-xs">
                <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180" />
                Ver alternativas
              </div>
            </summary>
            <div className="mt-4 space-y-2 pb-4" >
              {question.data.options.map((option, index) => (
                <div key={option.id} className="flex items-center gap-2">
                  <div className="w-8">
                    <div
                      className={`flex items-center justify-center font-medium w-8 h-8 border rounded-full ${
                        question.data.answer === option.id
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
          </details>
        </div>
        <footer className="flex items-center gap-2 border-t pt-2">{children}</footer>
      </CardContent>
    </Card>
  );
}
