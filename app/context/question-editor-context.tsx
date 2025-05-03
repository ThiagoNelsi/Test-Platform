"use client";

import { createContext, Dispatch, ReactNode, SetStateAction, useContext, useState } from "react";
import { PossibleQuestionTypes } from "@/lib/question";
import { MultipleChoiceQuestion } from "@/lib/multiple-choice-question";

type EditorContextType = {
  question: PossibleQuestionTypes;
  setQuestion: Dispatch<SetStateAction<PossibleQuestionTypes>>;

  setId: (id: PossibleQuestionTypes["id"]) => void;
  setData: (data: PossibleQuestionTypes["data"]) => void;
  setLevel: (level: PossibleQuestionTypes["level"]) => void;
  setType: (type: PossibleQuestionTypes["type"]) => void;
  setSubjects: (subjects: PossibleQuestionTypes["subjects"]) => void;
  setTags: (tags: PossibleQuestionTypes["tags"]) => void;

  setStatement: (statement: PossibleQuestionTypes["data"]["statement"]) => void;
  setOptions: (options: PossibleQuestionTypes["data"]["options"]) => void;
  setAnswer: (correctAnswer: PossibleQuestionTypes["data"]["answer"]) => void;
};

const QuestionEditorContext = createContext<EditorContextType | undefined>(
  undefined,
);

export const QuestionEditorProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [question, setQuestion] = useState<PossibleQuestionTypes>(MultipleChoiceQuestion.empty());

  const setId = (id: PossibleQuestionTypes["id"]) => {
    setQuestion((prev) => ({ ...prev, id } as PossibleQuestionTypes));
  }

  const setData = (data: PossibleQuestionTypes["data"]) => {
    setQuestion((prev) => ({ ...prev, data } as PossibleQuestionTypes));
  };

  const setLevel = (level: PossibleQuestionTypes["level"]) => {
    setQuestion((prev) => ({ ...prev, level } as PossibleQuestionTypes));
  };

  const setType = (type: PossibleQuestionTypes["type"]) => {
    setQuestion((prev) => ({ ...prev, type } as PossibleQuestionTypes));
  };

  const setSubjects = (subjects: PossibleQuestionTypes["subjects"]) => {
    setQuestion((prev) => ({ ...prev, subjects } as PossibleQuestionTypes));
  };

  const setTags = (tags: PossibleQuestionTypes["tags"]) => {
    setQuestion((prev) => ({ ...prev, tags } as PossibleQuestionTypes));
  };

  const setStatement = (statement: PossibleQuestionTypes["data"]["statement"]) => {
    setQuestion((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        statement,
      },
    } as PossibleQuestionTypes));
  };

  const setOptions = (options: PossibleQuestionTypes["data"]["options"]) => {
    setQuestion((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        options,
      },
    } as PossibleQuestionTypes));
  }

  const setAnswer = (answer: PossibleQuestionTypes["data"]["answer"]) => {
    setQuestion((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        answer,
      },
    } as PossibleQuestionTypes));
  }

  return (
    <QuestionEditorContext.Provider
      value={{
        question,
        setQuestion,

        setId,
        setData,
        setLevel,
        setType,
        setSubjects,
        setTags,

        setStatement,
        setOptions,
        setAnswer,
      }}
    >
      {children}
    </QuestionEditorContext.Provider>
  );
};

export const useQuestionEditor = () => {
  const context = useContext(QuestionEditorContext);
  if (!context) {
    throw new Error(
      "useQuestionEditor must be used within a QuestionEditorProvider",
    );
  }
  return context;
};
