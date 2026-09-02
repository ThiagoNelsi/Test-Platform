import type {
  CreateSubmissionRequest,
  CreateSubmissionResponse,
  FinishSubmissionRequest,
  FinishSubmissionResponse,
  SaveSubmissionRequest,
  SaveSubmissionResponse,
  SubmissionAnswers,
} from "api-contracts";
import { backendJson } from "./backend-api";

function toSubmissionAnswers(
  answers: Record<number, string>,
): SubmissionAnswers {
  return Object.fromEntries(
    Object.entries(answers).map(([questionId, answer]) => [
      String(questionId),
      answer,
    ]),
  );
}

function hydrateSubmissionDates(data: CreateSubmissionResponse) {
  return {
    ...data,
    test: {
      ...data.test,
      dueDate: data.test.dueDate ? new Date(data.test.dueDate) : null,
    },
    submission: {
      ...data.submission,
      startTime: new Date(data.submission.startTime),
      finishTime: data.submission.finishTime
        ? new Date(data.submission.finishTime)
        : null,
    },
  };
}

export const createSubmission = async (testId: number) => {
  const body: CreateSubmissionRequest = { testId };
  const data = await backendJson<CreateSubmissionResponse>("/api/submissions", {
    method: "POST",
    body,
  });

  return hydrateSubmissionDates(data);
};

export const saveSubmission = async (
  submissionId: number,
  answers: Record<number, string>,
) => {
  const body: SaveSubmissionRequest = {
    answers: toSubmissionAnswers(answers),
  };
  const data = await backendJson<SaveSubmissionResponse>(
    `/api/submissions/${submissionId}/save`,
    {
      method: "PATCH",
      body,
    },
  );

  return {
    ...data.submission,
    startTime: new Date(data.submission.startTime),
    finishTime: data.submission.finishTime
      ? new Date(data.submission.finishTime)
      : null,
  };
};

export const finishSubmission = async (
  submissionId: number,
  answers: Record<number, string>,
) => {
  const body: FinishSubmissionRequest = {
    answers: toSubmissionAnswers(answers),
  };
  const data = await backendJson<FinishSubmissionResponse>(
    `/api/submissions/${submissionId}/finish`,
    {
      method: "PATCH",
      body,
    },
  );

  return {
    ...data.submission,
    startTime: new Date(data.submission.startTime),
    finishTime: data.submission.finishTime
      ? new Date(data.submission.finishTime)
      : null,
  };
};
