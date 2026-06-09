"use server";

import { revalidatePath } from "next/cache";
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

const toQuestion = (question: any): Question => {
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
  const { ok, data } = await backendJson<{ question?: any }>(
    `/api/questions?id=${questionId}`,
  );

  if (!ok || !data?.question) {
    return null;
  }

  return toQuestion(data.question);
};

export const getQuestions = async (): Promise<Question[]> => {
  const { ok, data } = await backendJson<{ questions?: any[] }>(
    "/api/questions",
  );

  if (!ok || !data?.questions) {
    return [];
  }

  return data.questions.map((question) => toQuestion(question));
};

export const createQuestion = async (formData: FormData) => {
  const type = formData.get("type") as string;
  const level = formData.get("level") as string;
  const data = formData.get("data") as string;
  const source = formData.get("source") as string;
  const tags = JSON.parse((formData.get("tags") as string) || "[]") as number[];

  try {
    const { ok } = await backendJson("/api/questions", {
      method: "POST",
      body: {
        type,
        level: levelOptions.indexOf(level),
        content: JSON.parse(data),
        source: source || "MANUAL",
        tags,
      },
    });

    if (!ok) return false;

    revalidatePath("/questoes");
    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
};

export const createMultipleQuestions = async (questions: any[]) => {
  try {
    const { ok } = await backendJson("/api/questions/bulk", {
      method: "POST",
      body: {
        questions,
      },
    });

    if (!ok) return false;

    revalidatePath("/questoes");
    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
}

export const updateQuestion = async (
  questionId: number,
  formData: FormData,
) => {
  const type = formData.get("type") as string;
  const level = formData.get("level") as string;
  const data = formData.get("data") as string;
  const tags = JSON.parse((formData.get("tags") as string) || "[]") as number[];

  try {
    const { ok } = await backendJson(`/api/questions/${questionId}`, {
      method: "PATCH",
      body: {
        type,
        level: levelOptions.indexOf(level),
        content: JSON.parse(data),
        tags,
      },
    });

    if (!ok) return false;

    revalidatePath("/questoes");
    return true;
  } catch (err) {
    return false;
  }
};

export const deleteQuestion = async (questionIds: number[]) => {
  try {
    const { ok } = await backendJson("/api/questions", {
      method: "DELETE",
      body: { questionIds },
    });

    if (!ok) return false;

    revalidatePath("/questoes");
    return true;
  } catch (error) {
    console.error("Erro ao deletar questões:", error);
    return false;
  }
};
