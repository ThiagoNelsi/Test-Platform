import React, {
  Dispatch,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import { FormSection } from "../../new-question-modal";
import { useQuestionEditor } from "../../../context/question-editor-context";
import { MinimalTiptapEditor } from "../../minimal-tiptap";
import Options from "./options";
import { MultipleChoiceQuestion, Option } from "@/lib/multiple-choice-question";

type MultipleChoiceFormProps = {};

export default function MultipleChoiceForm({}: MultipleChoiceFormProps) {
  const { question, setStatement, setOptions, setData, setAnswer } = useQuestionEditor();
  const [isStatementFocused, setIsStatementFocused] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!question.data || question.data.statement === undefined || question.data.options === undefined) {
      setData(MultipleChoiceQuestion.empty().data);
      setOptions([
        new Option(""),
        new Option(""),
      ]);
    }
  }, []);

  if (question.data?.statement === undefined || question.data?.options === undefined) {
    return null;
  }

  return (
    <>
      <FormSection>
        <p className="text-sm mb-2">Enunciado</p>
        <MinimalTiptapEditor
          autofocus
          onFocus={() => setIsStatementFocused(true)}
          ref={editorRef}
          showToolbar={isStatementFocused}
          content={question.data.statement}
          onChange={(content) => setStatement(content?.toString() ?? "")}
          placeholder="Digite o enunciado da questão..."
          className="min-h-72"
        />
      </FormSection>
      <Options
        options={question.data.options}
        setOptions={setOptions as Dispatch<SetStateAction<Option[]>>}
        answer={question.data.answer}
        setAnswer={setAnswer}
      />
    </>
  );
}
