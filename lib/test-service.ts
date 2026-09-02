import type {
  DeleteTestResponse,
  OwnedTestsResponse,
  TestDto,
  TestResponse,
  TestSectionRequest,
  TestUpsertRequest,
  TestsResponse,
} from "api-contracts";
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

export type TestEntity = Omit<
  TestDto,
  "dueDate" | "publishDate" | "createdAt" | "modifiedAt" | "deletedAt"
> & {
  dueDate: Date | null;
  publishDate: Date | null;
  createdAt: Date;
  modifiedAt: Date;
  deletedAt: Date | null;
};

export type TestSummaryEntity = Omit<
  OwnedTestsResponse["tests"][number],
  "dueDate" | "publishDate" | "createdAt" | "modifiedAt"
> & {
  dueDate: Date | null;
  publishDate: Date | null;
  createdAt: Date;
  modifiedAt: Date;
};

function hydrateTestDates(test: TestDto): TestEntity {
  return {
    ...test,
    dueDate: test.dueDate ? new Date(test.dueDate) : null,
    publishDate: test.publishDate ? new Date(test.publishDate) : null,
    createdAt: new Date(test.createdAt),
    modifiedAt: new Date(test.modifiedAt),
    deletedAt: test.deletedAt ? new Date(test.deletedAt) : null,
  };
}

function hydrateTestSummaryDates(
  test: OwnedTestsResponse["tests"][number],
): TestSummaryEntity {
  return {
    ...test,
    dueDate: test.dueDate ? new Date(test.dueDate) : null,
    publishDate: test.publishDate ? new Date(test.publishDate) : null,
    createdAt: new Date(test.createdAt),
    modifiedAt: new Date(test.modifiedAt),
  };
}

function toPayload(data: DataParam): TestUpsertRequest {
  const sections: TestSectionRequest[] = data.sections.map((section) => ({
    selectionMode: section.selectionMode,
    shuffle: section.shuffle,
    questions: section.questions.map((question) => ({
      id: question.id,
      version: question.version,
    })),
    randomQuestionCount: section.randomQuestionCount,
  }));

  return {
    name: data.name,
    value: data.value,
    description: data.description,
    duration: data.duration,
    status: data.status,
    classroomIds: data.classroomIds,
    sections,
    dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
    publishDate: data.publishDate
      ? new Date(data.publishDate).toISOString()
      : null,
  };
}

export const createTest = async (
  data: DataParam,
): Promise<TestEntity> => {
  const response = await backendJson<TestResponse | TestsResponse>(
    "/api/tests",
    {
      method: "POST",
      body: toPayload(data),
    },
  );

  const test = "test" in response ? response.test : response.tests?.[0];

  if (!test) {
    throw new Error("Backend did not return the created test");
  }

  return hydrateTestDates(test);
};

export const updateTest = async (
  testId: number,
  data: DataParam,
): Promise<TestEntity> => {
  const response = await backendJson<TestResponse>(`/api/tests/${testId}`, {
    method: "PATCH",
    body: toPayload(data),
  });

  if (!response.test) {
    throw new Error("Backend did not return the updated test");
  }

  return hydrateTestDates(response.test);
};

export const getOwnedTests = async (): Promise<TestSummaryEntity[]> => {
  const response = await backendJson<OwnedTestsResponse>("/api/tests");
  return response.tests.map((test) => hydrateTestSummaryDates(test));
};

export const publishTest = async (
  testId: number,
  classroomIds: number[],
): Promise<TestEntity[] | null> => {
  const response = await backendJson<TestsResponse>(
    `/api/tests/${testId}/publish`,
    {
      method: "POST",
      body: { classroomIds },
    },
  );

  return response.tests.map((test) => hydrateTestDates(test));
};

export const scheduleTest = async (
  testId: number,
  classroomIds: number[],
): Promise<TestEntity[] | null> => {
  const response = await backendJson<TestsResponse>(
    `/api/tests/${testId}/schedule`,
    {
      method: "POST",
      body: { classroomIds },
    },
  );

  return response.tests.map((test) => hydrateTestDates(test));
};

export const getUnfinishedTests = async () => {
  return [] as Todo[];
};

export const getTest = async (testId: number): Promise<TestEntity> => {
  const response = await backendJson<TestResponse>(`/api/tests/${testId}`);
  if (!response.test) {
    throw new Error("Backend did not return the requested test");
  }

  return hydrateTestDates(response.test);
};

export const getStudentTest = async (_testId: number) => {
  return null;
};

export const deleteTest = async (
  testId: number,
  softDelete: boolean = true,
) => {
  return backendJson<DeleteTestResponse>(
    `/api/tests/${testId}?softDelete=${softDelete}`,
    {
      method: "DELETE",
    },
  );
};
