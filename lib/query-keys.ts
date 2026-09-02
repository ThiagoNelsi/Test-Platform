import type { ResourceStatus } from "api-contracts";

export const queryKeys = {
  auth: ["auth", "me"] as const,
  classrooms: ["classrooms"] as const,
  questions: ["questions"] as const,
  question: (questionId: number) => ["questions", questionId] as const,
  tags: ["tags"] as const,
  questionsPerTag: ["tags", "questions-per-tag"] as const,
  tests: ["tests"] as const,
  test: (testId: number) => ["tests", testId] as const,
  resources: (status?: ResourceStatus) =>
    status ? (["resources", status] as const) : (["resources"] as const),
  repositoryQuestions: ["repository", "questions"] as const,
  submission: (testId: number) => ["submissions", testId] as const,
};
