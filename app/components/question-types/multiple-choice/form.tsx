import React, {
  Dispatch,
  SetStateAction,
  useEffect,
  useRef,
} from "react";
import { useQuestionEditor } from "../../../context/question-editor-context";
import { MinimalTiptapEditor } from "../../minimal-tiptap";
import Options from "./options";
import { MultipleChoiceQuestion, Option } from "@/lib/multiple-choice-question";

type MultipleChoiceFormProps = {};

export default function MultipleChoiceForm({}: MultipleChoiceFormProps) {
  const { question, setStatement, setOptions, setData, setAnswer } = useQuestionEditor();

  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!question.content || question.content.statement === undefined || question.content.options === undefined) {
      setData(MultipleChoiceQuestion.empty().content);
      setOptions([
        new Option(""),
        new Option(""),
      ]);
    }
  }, []);

  if (question.content?.statement === undefined || question.content?.options === undefined) {
    return null;
  }

  return (
    <div className="flex flex-col gap-8 max-w-[80ch]">
      <MinimalTiptapEditor
        autofocus
        ref={editorRef}
        showToolbar={true}
        content={question.content.statement}
        onChange={(content) => setStatement(content?.toString() ?? "")}
        placeholder="Digite o enunciado da questão..."
        className="min-h-72"
      />
      <Options
        options={question.content.options}
        setOptions={setOptions as Dispatch<SetStateAction<Option[]>>}
        answer={question.content.answer}
        setAnswer={setAnswer}
      />
    </div>
  );
}
