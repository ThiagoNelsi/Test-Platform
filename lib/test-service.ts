"use server";

import { revalidatePath } from "next/cache";
import { TestData } from "./types";
import { backendJson } from "./backend-api";

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
    }[];
    randomQuestionCount?: number;
  }[];
};

export type TestSection = {
  shuffle?: boolean;
  count?: number;
  questions: {
    questionId: number;
    version: number;
  }[];
};

type AnyRecord = Record<string, any>;
type TestEntity = AnyRecord;

function hydrateTestDates<T extends AnyRecord>(test: T): T {
  return {
    ...test,
    dueDate: test.dueDate ? new Date(test.dueDate) : null,
    publishDate: test.publishDate ? new Date(test.publishDate) : null,
    createdAt: test.createdAt ? new Date(test.createdAt) : null,
    modifiedAt: test.modifiedAt ? new Date(test.modifiedAt) : null,
  };
}

function toPayload(data: DataParam) {
  return {
    ...data,
    dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
    publishDate: data.publishDate
      ? new Date(data.publishDate).toISOString()
      : null,
  };
}

export const createTest = async (
  data: DataParam,
): Promise<TestEntity | null> => {
  const { ok, data: response } = await backendJson<{
    test?: AnyRecord;
    tests?: AnyRecord[];
  }>("/api/tests", {
    method: "POST",
    body: toPayload(data),
  });

  if (!ok || !response) return null;

  if (response.test) {
    return hydrateTestDates(response.test);
  }

  if (response.tests?.length) {
    return hydrateTestDates(response.tests[0]);
  }

  return null;
};

export const updateTest = async (
  testId: number,
  data: DataParam,
): Promise<TestEntity | null> => {
  const { ok, data: response } = await backendJson<{ test?: AnyRecord }>(
    `/api/tests/${testId}`,
    {
      method: "PATCH",
      body: toPayload(data),
    },
  );

  if (!ok || !response?.test) return null;

  return hydrateTestDates(response.test);
};

export const getOwnedTests = async () => {
  const { ok, data } = await backendJson<{ tests?: AnyRecord[] }>("/api/tests");
  if (!ok || !data?.tests) return null;

  return data.tests.map((test) => hydrateTestDates(test));
};

export const publishTest = async (
  testId: number,
  classroomIds: number[],
): Promise<TestEntity[] | null> => {
  const { ok, data } = await backendJson<{ tests?: AnyRecord[] }>(
    `/api/tests/${testId}/publish`,
    {
      method: "POST",
      body: { classroomIds },
    },
  );

  if (!ok || !data?.tests) return null;

  revalidatePath("/provas");
  return data.tests.map((test) => hydrateTestDates(test));
};

export const scheduleTest = async (
  testId: number,
  classroomIds: number[],
): Promise<TestEntity[] | null> => {
  const { ok, data } = await backendJson<{ tests?: AnyRecord[] }>(
    `/api/tests/${testId}/schedule`,
    {
      method: "POST",
      body: { classroomIds },
    },
  );

  if (!ok || !data?.tests) return null;

  return data.tests.map((test) => hydrateTestDates(test));
};

export const getUnfinishedTests = async () => {
  return [] as Todo[];
};

export const getTest = async (testId: number) => {
  const { ok, data } = await backendJson<{ test?: AnyRecord }>(
    `/api/tests/${testId}`,
  );

  if (!ok || !data?.test) return null;

  return hydrateTestDates(data.test);
};

export const getStudentTest = async (_testId: number) => {
  return null;
};

export const deleteTest = async (
  testId: number,
  softDelete: boolean = true,
) => {
  const { ok } = await backendJson<{ test?: AnyRecord; deleted?: string }>(
    `/api/tests/${testId}?softDelete=${softDelete}`,
    {
      method: "DELETE",
    },
  );

  if (!ok) return false;

  revalidatePath("/provas");

  return true;
};
