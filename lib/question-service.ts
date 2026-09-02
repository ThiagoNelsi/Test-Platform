import type {
  BulkCreateResponse,
  CreateQuestionRequest,
  CreateQuestionsBulkRequest,
  QuestionDeleteResponse,
  QuestionMutationResponse,
  QuestionResponse,
  QuestionsResponse,
  UpdateQuestionRequest,
} from "api-contracts";
import { Question, QuestionType } from "@/lib/types";
import { backendJson } from "./backend-api";

const levelOptions = ["easy", "medium", "hard"];

const parseQuestionContent = (value: unknown) => {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const toQuestion = (question: QuestionResponse["question"]): Question => {
  return {
    ...question,
    type: question.type as QuestionType,
    content: parseQuestionContent(question.content),
    createdAt: question.createdAt ? new Date(question.createdAt) : null,
  };
};

export const getQuestion = async (
  questionId: number,
): Promise<Question | null> => {
  const data = await backendJson<QuestionResponse>(
    `/api/questions?id=${questionId}`,
  );

  return data.question ? toQuestion(data.question) : null;
};

export const getQuestions = async (): Promise<Question[]> => {
  const data = await backendJson<QuestionsResponse>("/api/questions");

  return data.questions.map((question) => toQuestion(question));
};

export const createQuestion = async (formData: FormData) => {
  const type = String(formData.get("type") || "");
  const level = String(formData.get("level") || "");
  const data = String(formData.get("data") || "{}");
  const source = formData.get("source");
  const tags = JSON.parse(String(formData.get("tags") || "[]")) as number[];
  const body: CreateQuestionRequest = {
    type,
    level: levelOptions.indexOf(level),
    content: JSON.parse(data),
    source: typeof source === "string" ? source || "MANUAL" : "MANUAL",
    tags,
  };

  await backendJson<QuestionResponse>("/api/questions", {
    method: "POST",
    body,
  });

  return true;
};

export const createMultipleQuestions = async (
  questions: CreateQuestionRequest[],
) => {
  const body: CreateQuestionsBulkRequest = { questions };
  return backendJson<BulkCreateResponse>("/api/questions/bulk", {
    method: "POST",
    body,
  });
};

export const updateQuestion = async (
  questionId: number,
  formData: FormData,
) => {
  const type = String(formData.get("type") || "");
  const level = String(formData.get("level") || "");
  const data = String(formData.get("data") || "{}");
  const tags = JSON.parse(String(formData.get("tags") || "[]")) as number[];
  const body: UpdateQuestionRequest = {
    type,
    level: levelOptions.indexOf(level),
    content: JSON.parse(data),
    tags,
  };

  return backendJson<QuestionMutationResponse>(`/api/questions/${questionId}`, {
    method: "PATCH",
    body,
  });
};

export const deleteQuestion = async (questionIds: number[]) => {
  return backendJson<QuestionDeleteResponse>("/api/questions", {
    method: "DELETE",
    body: { questionIds },
  });
};
