"use server";

import { revalidatePath } from "next/cache";
import { getUserId } from "./auth";
import prisma from "./prisma";
import { Question, QuestionType } from "@/lib/types";
import {
  Test,
  Question as PostgresQuestion,
} from "@prisma/client";
import { isEqual } from "lodash";

const levelOptions = ["easy", "medium", "hard"];

export const getQuestion = async (
  questionId: number,
): Promise<Question | null> => {
  const userId = await getUserId();
  if (!userId) return null;

  const postgresData = await prisma.question.findUnique({
    where: {
      id: questionId,
    },
    include: {
      tags: true,
    },
  });

  if (!postgresData) return null;

  return {
    ...postgresData,
    type: postgresData.type as QuestionType,
    data: postgresData.content,
  };
};

export const getQuestions = async (): Promise<Question[]> => {
  const userId = await getUserId();
  if (!userId) return [];

  const postgresData = await prisma.question.findMany({
    where: {
      authorId: userId,
      originalQuestionId: null,
      deletedAt: null,
    },
    include: {
      tags: true,
    },
  });

  return postgresData.map((question) => {
    return {
      ...question,
      type: question.type as QuestionType,
      data: question.content,
    };
  });
};

export const createQuestion = async (formData: FormData) => {
  const userId = await getUserId();
  if (!userId) return null;

  const type = formData.get("type") as string;
  const level = formData.get("level") as string;
  const data = formData.get("data") as string;
  const tags = JSON.parse(formData.get("tags") as string) as number[];

  try {
    const question = await prisma.question.create({
      data: {
        type,
        level: levelOptions.indexOf(level),
        authorId: userId,
        content: JSON.parse(data),
        tags: {
          connect: tags.map((tagId) => ({ id: tagId })),
        },
      },
    });
    revalidatePath("/questions");
    return true;
  } catch (err) {
    return false;
  }
};

const checkEqual = (obj1: any, obj2: any) => {
  return isEqual(obj1, obj2);
};

export const updateQuestion = async (
  questionId: number,
  formData: FormData,
) => {
  const userId = await getUserId();
  if (!userId) return null;

  const type = formData.get("type") as string;
  const level = formData.get("level") as string;
  const data = formData.get("data") as string;
  const tags = JSON.parse(formData.get("tags") as string) as number[];

  try {
    const question = await prisma.question.findUnique({
      where: {
        id: questionId,
      },
      include: {
        tags: true,
      },
    });
    if (!question) return false;

    const questionsAreEqual = checkEqual(
      {
        type: question.type,
        level: question.level,
        data: question.content,
        tags: question.tags.map((tag) => tag.id),
      },
      {
        type,
        level: levelOptions.indexOf(level),
        data: JSON.parse(data),
        tags,
      },
    );

    if (questionsAreEqual) return true;

    await prisma.$transaction(async (prisma) => {
      const testContainingThisVersion: Test[] = await prisma.$queryRaw`
                SELECT *
                FROM "Test"
                WHERE EXISTS (
                    SELECT 1
                    FROM jsonb_array_elements("Test".sections) AS section
                    WHERE EXISTS (
                        SELECT 1
                        FROM jsonb_array_elements(section->'questions') AS question
                        WHERE (question->>'id')::int = ${questionId}
                        AND (question->>'version')::int = ${question.version}
                    )
                )
                LIMIT 1;
            `;

      if (testContainingThisVersion.length > 0) {
        // This question version is being used in a test, so we need to create a snapshot
        const q: any = { ...question };
        delete q.id;
        delete q.createdAt;
        delete q.tags;

        await prisma.question.create({
          data: {
            ...q,
            originalQuestionId: questionId,
          },
        });
      }

      const questionTags = await prisma.question.findUnique({
        where: {
          id: questionId,
        },
        select: {
          tags: {
            select: {
              id: true,
            },
          },
        },
      });

      let disconnectTags: { id: number }[] = [];

      if (questionTags) {
        disconnectTags = questionTags.tags.filter((tag) => {
          return !tags.includes(tag.id);
        });
      }

      await prisma.question.update({
        where: {
          id: questionId,
          authorId: userId,
        },
        data: {
          type,
          level: levelOptions.indexOf(level),
          tags: {
            connect: tags.map((tagId) => ({ id: tagId })),
            disconnect: disconnectTags,
          },
          content: JSON.parse(data),
          version: question.version + 1,
        },
      });
    });

    revalidatePath("/questions");
    return true;
  } catch (err) {
    return false;
  }
};

export const deleteQuestion = async (questionIds: number[]) => {
  try {
    const userId = await getUserId();
    if (!userId) return false;

    const { count } = await prisma.question.updateMany({
      where: {
        id: { in: questionIds },
        authorId: userId,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    if (count === 0) return false;

    revalidatePath("/questions");
    return true;
  } catch (error) {
    console.error("Erro ao deletar questões:", error);
    return false;
  }
};
