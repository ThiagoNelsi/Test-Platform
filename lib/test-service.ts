"use server";

import { prisma } from "./prisma";
import { getUserId } from "./auth";
import { TestData } from "./types";
import { revalidatePath } from "next/cache";
import { InputJsonValue } from "@/prisma/generated/postgres/runtime/library";
import { Test } from "@/prisma/generated/postgres";

export type Todo = {
  id: number;
  name: string;
  dueDate?: Date;
  startTime?: Date;
  finishTime?: Date;
};

export type DataParam = Omit<Partial<TestData>, "sections"> & {
  sections: {
    selectionMode: string;
    shuffle?: boolean;
    questions: {
      id: number;
      version: number;
    }[]; // [questionId, version]
    randomQuestionCount?: number;
  }[];
};

const createTestAuxiliar = async (
  prisma: any,
  authorId: number,
  data: DataParam,
  questionMap: Map<number, number>,
  classroomId?: number,
) => {
  return await prisma.test.create({
    data: {
      authorId,
      name: data.name,
      value: data.value,
      dueDate: data.dueDate,
      timer: data.duration,
      description: data.description,
      publishDate: data.publishDate,
      status: data.status,
      classroomId: classroomId,
      sections: data.sections.map((section) => {
        if (section.selectionMode === "random") {
          return {
            count: section.randomQuestionCount,
            questions: section.questions.map((q) => ({
              questionId: q.id,
              version: questionMap.get(q.id),
            })),
          };
        }
        return {
          shuffle: section.shuffle,
          questions: section.questions.map((q) => ({
            questionId: q.id,
            version: questionMap.get(q.id),
          })),
        };
      }),
    },
  });
};

const getCurrentQuestionVersions = async (sections: DataParam["sections"]) => {
  const questionIds = sections.flatMap((section) =>
    section.questions.map((q) => q.id),
  );
  const questions = await prisma.question.findMany({
    where: {
      id: {
        in: questionIds,
      },
    },
    select: {
      id: true,
      version: true,
    },
  });

  const questionMap = new Map<number, number>();
  questions.forEach((q) => {
    questionMap.set(q.id, q.version);
  });

  return questionMap;
};

export const createTest = async (data: DataParam) => {
  const userId = await getUserId();
  if (!userId) return null;

  // Fetch current question versions
  const questionMap = await getCurrentQuestionVersions(data.sections);

  try {
    data.status =
      data.status === "published" && data.publishDate
        ? "scheduled"
        : data.status;

    if (data.status === "draft" || !data.classroomIds) {
      const test = await createTestAuxiliar(prisma, userId, data, questionMap);
      return test;
    }

    const tests = await prisma.$transaction(async (prisma) => {
      if (!data.classroomIds) return;
      const res = data.classroomIds.map(async (classroomId, index) => {
        return await createTestAuxiliar(
          prisma,
          userId,
          data,
          questionMap,
          classroomId,
        );
      });
      return await Promise.all(res);
    });

    return tests;
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const updateTest = async (testId: number, data: DataParam) => {
  console.log(testId);
  console.log(data);
  const userId = await getUserId();
  if (!userId) return null;

  // Fetch current question versions
  const questionMap = await getCurrentQuestionVersions(data.sections);

  try {
    data.status =
      data.status === "published" && data.publishDate
        ? "scheduled"
        : data.status;

    const test = await prisma.test.update({
      where: {
        id: testId,
      },
      data: {
        name: data.name,
        value: data.value,
        dueDate: data.dueDate,
        timer: data.duration,
        description: data.description,
        publishDate: data.publishDate,
        status: data.status,
        modifiedAt: new Date(),
        sections: data.sections.map((section) => {
          if (section.selectionMode === "random") {
            return {
              count: section.randomQuestionCount,
              questions: section.questions.map((q) => ({
                questionId: q.id,
                version: questionMap.get(q.id),
              })),
            };
          }
          return {
            shuffle: section.shuffle,
            questions: section.questions.map((q) => ({
              questionId: q.id,
              version: questionMap.get(q.id),
            })),
          };
        }),
      },
    });

    return test;
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const getOwnedTests = async () => {
  const userId = await getUserId();
  if (!userId) return null;

  const ownedTests = await prisma.test.findMany({
    where: {
      authorId: userId,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      description: true,
      value: true,
      dueDate: true,
      publishDate: true,
      status: true,
      createdAt: true,
      modifiedAt: true,
      classroom: {
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              students: true,
            },
          },
        },
      },
      _count: {
        select: {
          instances: {
            where: {
              finishTime: {
                not: null,
              },
            },
          },
        },
      },
    },
    orderBy: {
      modifiedAt: "desc",
    },
  });

  return ownedTests;
};

export const publishTest = async (testId: number, classroomIds: number[]) => {
  const userId = await getUserId();
  if (!userId) return null;

  const update = async (id: number, classroom?: number) => {
    const publishedTest = await prisma.test.update({
      where: {
        id,
      },
      data: {
        status: "published",
        classroomId: classroom,
      },
    });
    return publishedTest;
  };

  try {
    const test = await prisma.test.findFirst({
      where: {
        id: testId,
        authorId: userId,
      },
    });

    if (!test) return false;

    if (classroomIds.length > 0) {
      const classrooms = await prisma.classroom.findMany({
        where: {
          id: {
            in: classroomIds,
          },
          ownerId: userId,
        },
        select: {
          id: true,
        },
      });
      const publishedTests = await prisma.$transaction(async (prisma) => {
        const res = classroomIds.map(async (classroomId, index) => {
          if (index === 0) return update(testId, classroomId);

          if (classrooms.findIndex((c) => c.id === classroomId) === -1) return;

          return await prisma.test.create({
            data: {
              ...test,
              id: undefined,
              classroomId: classroomId,
              status: "published",
              sections: test.sections as InputJsonValue,
            },
          });
        });
        return await Promise.all(res);
      });
      console.log("PUBLICADO");
      console.log(publishedTests);
      revalidatePath("/tests");
      return publishedTests;
    } else {
      const publishedTest = await update(testId);
      revalidatePath("/tests");
      return publishedTest;
    }
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const scheduleTest = async (testId: number, classroomIds: number[]) => {
  const userId = await getUserId();
  if (!userId) return null;

  if (classroomIds.length === 0) return false;

  try {
    const test = await prisma.test.findFirst({
      where: {
        id: testId,
        authorId: userId,
      },
    });

    if (!test) return false;

    const classrooms = await prisma.classroom.findMany({
      where: {
        id: {
          in: classroomIds,
        },
        ownerId: userId,
      },
      select: {
        id: true,
      },
    });

    const scheduledTests = await prisma.$transaction(async (prisma) => {
      const res = classroomIds.map(async (classroomId, index) => {
        if (index === 0) return prisma.test.update({
          where: {
            id: testId,
          },
          data: {
            status: "scheduled",
            classroomId,
          },
        });

        if (classrooms.findIndex((c) => c.id === classroomId) === -1) return;

        return prisma.test.create({
          data: {
            ...test,
            id: undefined,
            classroomId: classroomId,
            status: "scheduled",
            sections: test.sections as InputJsonValue,
          },
        });
      });
      return await Promise.all(res);
    });
    console.log("AGENDADO");
    console.log(scheduledTests);
    return scheduledTests;
  } catch (error) {
    console.log(error);
    return false;
  }
}

export const getUnfinishedTests = async () => {
  const userId = await getUserId();
  if (!userId) return null;

  const unfinishedTests = await prisma.test.findMany({
    where: {
      deletedAt: null,
      OR: [
        {
          instances: {
            some: {
              id: userId,
              finishTime: null, // Test is not finished
            },
          },
        },
        {
          instances: {
            none: {
              id: userId,
            }, // Test is not started
          },
        },
      ],
    },
    select: {
      id: true,
      name: true,
      dueDate: true,
      instances: {
        where: { id: userId },
        select: {
          startTime: true,
          finishTime: true,
        },
      },
    },
  });

  const todos: Todo[] = unfinishedTests.map((test) => ({
    id: test.id,
    name: test.name,
    dueDate: test.dueDate ?? undefined,
    startTime: test.instances[0]?.startTime ?? undefined,
    finishTime: test.instances[0]?.finishTime ?? undefined,
  }));

  return todos;
};

export const getTest = async (testId: number) => {
  const userId = await getUserId();
  if (!userId) return null;

  const test = await prisma.test.findFirst({
    where: {
      id: testId,
      authorId: userId,
      deletedAt: null,
    },
  });

  return test;
};

export const deleteTest = async (
  testId: number,
  softDelete: boolean = true,
) => {
  const userId = await getUserId();
  if (!userId) return null;

  try {
    const test = await prisma.test.findFirst({
      where: {
        id: testId,
        authorId: userId,
      },
    });

    if (!test) return false;

    if (softDelete) {
      const deletedTest = await prisma.test.update({
        where: {
          id: testId,
        },
        data: {
          deletedAt: new Date(),
        },
      });
      return deletedTest;
    }

    await prisma.test.delete({
      where: {
        id: testId,
      },
    });

    revalidatePath("/tests");

    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};
