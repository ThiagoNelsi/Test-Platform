import { backendJson } from "./backend-api";

const hydrateSubmissionDates = <T extends Record<string, any>>(payload: T): T => {
  if (!payload?.submission) return payload;

  return {
    ...payload,
    test: {
      ...payload.test,
      dueDate: payload.test?.dueDate ? new Date(payload.test.dueDate) : null,
    },
    submission: {
      ...payload.submission,
      startTime: payload.submission.startTime
        ? new Date(payload.submission.startTime)
        : null,
      finishTime: payload.submission.finishTime
        ? new Date(payload.submission.finishTime)
        : null,
    },
  };
};

export const createSubmission = async (testId: number) => {
  const { ok, data } = await backendJson<any>("/api/submissions", {
    method: "POST",
    body: { testId },
  });

  if (!ok || !data) return null;

  return hydrateSubmissionDates(data);
};

export const saveSubmission = async (
  submissionId: number,
  answers: Record<number, string>,
) => {
  const { ok, data } = await backendJson<any>(
    `/api/submissions/${submissionId}/save`,
    {
      method: "PATCH",
      body: { answers },
    },
  );

  if (!ok || !data?.submission) return null;

  return {
    ...data.submission,
    startTime: data.submission.startTime
      ? new Date(data.submission.startTime)
      : null,
    finishTime: data.submission.finishTime
      ? new Date(data.submission.finishTime)
      : null,
  };
};

export const finishSubmission = async (
  submissionId: number,
  answers: Record<number, string>,
) => {
  const { ok, data } = await backendJson<any>(
    `/api/submissions/${submissionId}/finish`,
    {
      method: "PATCH",
      body: { answers },
    },
  );

  if (!ok || !data?.submission) return null;

  return {
    ...data.submission,
    startTime: data.submission.startTime
      ? new Date(data.submission.startTime)
      : null,
    finishTime: data.submission.finishTime
      ? new Date(data.submission.finishTime)
      : null,
  };
};
