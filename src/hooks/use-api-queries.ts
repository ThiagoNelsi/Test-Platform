
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  CreateQuestionRequest,
  CreateResourceRequest,
  ResourceStatus,
} from "api-contracts";
import {
  createClassroom,
  getClassrooms,
  joinClassroom,
} from "@/lib/classroomService";
import {
  createMultipleQuestions,
  createQuestion,
  deleteQuestion,
  getQuestion,
  getQuestions,
  updateQuestion,
} from "@/lib/question-service";
import {
  cloneRepositoryQuestions,
  getRepositoryQuestions,
} from "@/lib/repository-service";
import {
  createResource,
  getResources,
} from "@/lib/resource-service";
import {
  createSubmission,
  finishSubmission,
  saveSubmission,
} from "@/lib/submission-service";
import { requestPresignedUpload } from "@/lib/upload-service";
import {
  createTest,
  deleteTest,
  getOwnedTests,
  getTest,
  publishTest,
  scheduleTest,
  updateTest,
  type DataParam,
} from "@/lib/test-service";
import {
  createTag,
  getQuestionsPerTag,
  getTags,
} from "@/lib/tag-service";
import type { Tag } from "@/lib/types";
import { queryKeys } from "@/lib/query-keys";

export function useClassroomsQuery() {
  return useQuery({
    queryKey: queryKeys.classrooms,
    queryFn: getClassrooms,
  });
}

export function useQuestionsQuery() {
  return useQuery({
    queryKey: queryKeys.questions,
    queryFn: getQuestions,
  });
}

export function useQuestionQuery(questionId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.question(questionId ?? 0),
    queryFn: () => {
      if (questionId === undefined) return Promise.resolve(null);
      return getQuestion(questionId);
    },
    enabled: questionId !== undefined,
  });
}

export function useTagsQuery() {
  return useQuery({
    queryKey: queryKeys.tags,
    queryFn: getTags,
  });
}

export function useQuestionsPerTagQuery() {
  return useQuery({
    queryKey: queryKeys.questionsPerTag,
    queryFn: getQuestionsPerTag,
  });
}

export function useResourcesQuery(status?: ResourceStatus) {
  return useQuery({
    queryKey: queryKeys.resources(status),
    queryFn: () => getResources(status),
    // Textract updates resources asynchronously. Keep the library current
    // while there is work in flight, then stop polling once it settles.
    refetchInterval: (query) => {
      const resources = query.state.data;
      return resources?.some(
        (resource) => resource.status === "UPLOADED" || resource.status === "PROCESSING",
      )
        ? 5_000
        : false;
    },
  });
}

export function useOwnedTestsQuery() {
  return useQuery({
    queryKey: queryKeys.tests,
    queryFn: getOwnedTests,
  });
}

export function useTestQuery(testId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.test(testId ?? 0),
    queryFn: () => {
      if (testId === undefined) return Promise.resolve(null);
      return getTest(testId);
    },
    enabled: testId !== undefined,
  });
}

export function useRepositoryQuestionsQuery() {
  return useQuery({
    queryKey: queryKeys.repositoryQuestions,
    queryFn: getRepositoryQuestions,
  });
}

export function useCreateClassroomMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createClassroom,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.classrooms }),
  });
}

export function useJoinClassroomMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: joinClassroom,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.classrooms }),
  });
}

export function useCreateQuestionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createQuestion,
    onSuccess: () => {
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.questions }),
        queryClient.invalidateQueries({ queryKey: queryKeys.questionsPerTag }),
      ]);
    },
  });
}

export function useCreateMultipleQuestionsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (questions: CreateQuestionRequest[]) =>
      createMultipleQuestions(questions),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.questions }),
  });
}

export function useUpdateQuestionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ questionId, formData }: { questionId: number; formData: FormData }) =>
      updateQuestion(questionId, formData),
    onSuccess: (_data, variables) => {
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.questions }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.question(variables.questionId),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.questionsPerTag }),
      ]);
    },
  });
}

export function useDeleteQuestionsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (questionIds: number[]) => deleteQuestion(questionIds),
    onSuccess: () => {
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.questions }),
        queryClient.invalidateQueries({ queryKey: queryKeys.questionsPerTag }),
      ]);
    },
  });
}

export function useCreateTagMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tag: Pick<Tag, "name" | "color">) => createTag(tag),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.tags }),
  });
}

export function useCreateResourceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateResourceRequest) => createResource(request),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.resources() }),
  });
}

export function usePresignedUploadMutation() {
  return useMutation({
    mutationFn: ({ contentType }: { contentType: string }) =>
      requestPresignedUpload(contentType),
  });
}

export function useCreateTestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTest,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.tests }),
  });
}

export function useUpdateTestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ testId, data }: { testId: number; data: DataParam }) =>
      updateTest(testId, data),
    onSuccess: (_data, variables) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.tests }),
        queryClient.invalidateQueries({ queryKey: queryKeys.test(variables.testId) }),
      ]),
  });
}

export function usePublishTestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ testId, classroomIds }: { testId: number; classroomIds: number[] }) =>
      publishTest(testId, classroomIds),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.tests }),
  });
}

export function useScheduleTestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ testId, classroomIds }: { testId: number; classroomIds: number[] }) =>
      scheduleTest(testId, classroomIds),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.tests }),
  });
}

export function useDeleteTestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ testId, softDelete = true }: { testId: number; softDelete?: boolean }) =>
      deleteTest(testId, softDelete),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.tests }),
  });
}

export function useCloneRepositoryQuestionsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cloneRepositoryQuestions,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.questions }),
  });
}

export function useStartSubmissionMutation() {
  return useMutation({
    mutationFn: createSubmission,
  });
}

export function useSaveSubmissionMutation() {
  return useMutation({
    mutationFn: ({ submissionId, answers }: { submissionId: number; answers: Record<number, string> }) =>
      saveSubmission(submissionId, answers),
  });
}

export function useFinishSubmissionMutation() {
  return useMutation({
    mutationFn: ({ submissionId, answers }: { submissionId: number; answers: Record<number, string> }) =>
      finishSubmission(submissionId, answers),
  });
}
