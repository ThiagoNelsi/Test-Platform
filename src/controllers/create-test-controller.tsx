import { useEffect, useCallback, useMemo, useRef } from "react";
import { IQuestion, TestData } from "@/lib/types";
import { QuestionFactory } from "@/lib/question";
import { Section, useCreateTest } from "@/src/context/create-test-context";
import {
  useAppNavigate as useNavigate,
  useAppSearchParams as useSearchParams,
} from "@/src/components/router-helpers";

import { errorToast, infoToast, successToast } from "@/lib/toasters";
import {
  DataParam,
} from "@/lib/test-service";
import { getQuestion } from "@/lib/question-service";
import type { Classroom } from "@/lib/classroomService";
import { useDebounce } from "@/src/hooks/useDebounce";
import { getApiErrorMessage } from "@/lib/backend-api";
import {
  useClassroomsQuery,
  useCreateTestMutation,
  usePublishTestMutation,
  useQuestionsQuery,
  useScheduleTestMutation,
  useTagsQuery,
  useTestQuery,
  useUpdateTestMutation,
} from "@/src/hooks/use-api-queries";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

type SectionFromServer = {
  shuffle?: boolean;
  questions: {
    questionId: number;
    version: number;
  }[];
  count?: number;
};

type ValidationErrorResult = {
  valid: false;
  errors: string[];
};

type ValidationSuccessResult = {
  valid: true;
  data: DataParam;
};

type ValidationResult = ValidationErrorResult | ValidationSuccessResult;

const validateAndFormat = (
  data: TestData,
  isDraft: boolean,
  enablePublishDate: boolean,
): ValidationResult => {
  const errors: string[] = [];

  if (!data.name) errors.push("Nome da prova é obrigatório");

  if (!isDraft) {
    if (!data.value) errors.push("Valor da prova é obrigatório");
    if (data.dueDate) {
      if (data.dueDate.getTime() < new Date().getTime())
        errors.push("Data de entrega inválida");
      if (
        data.publishDate &&
        data.publishDate.getTime() > data.dueDate.getTime()
      ) {
        errors.push("Data de publicação não pode ser posterior à data de entrega");
      }
    }
    if (
      enablePublishDate &&
      data.publishDate &&
      data.publishDate.getTime() < new Date().getTime()
    ) {
      errors.push("Data de publicação inválida");
    }
    if (data.classroomIds.length < 1) errors.push("Turma não definida");

    if (data.sections.length === 0)
      errors.push("Nenhuma seção de questões definida");
    data.sections.forEach((section, index) => {
      if (section.questions.length === 0) {
        errors.push(`Seção ${index + 1}: Nenhuma questão selecionada`);
      } else if (section.selectionMode === "random") {
        if (!section.randomQuestionCount) {
          errors.push(`Seção ${index + 1}: Número de questões aleatórias não definido`);
        } else {
          if (section.randomQuestionCount > section.questions.length) {
            errors.push(
              `Seção ${index + 1}: Número de questões aleatórias maior que o número de questões disponíveis`,
            );
          }
          if (section.randomQuestionCount < 1) {
            errors.push(`Seção ${index + 1}: Número de questões aleatórias inválido`);
          }
        }
      }
    });
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
    };
  }

  return {
    valid: true,
    data: {
      name: data.name,
      value: data.value,
      description: data.description,
      dueDate: data.dueDate,
      duration: data.duration,
      publishDate: data.publishDate,
      classroomIds: data.classroomIds,
      status: data.status,
      sections: data.sections.map((section) => ({
        questions: section.questions.map((question) => ({
          id: question.id,
          version: question.version,
        })),
        selectionMode: section.selectionMode || "all",
        shuffle: section.shuffle,
        randomQuestionCount: section.randomQuestionCount,
      })),
    },
  };
};

export const useCreateTestController = (createTestContext: ReturnType<typeof useCreateTest>) => {
  const [searchParams] = useSearchParams();
  const testIdParam = searchParams.get("test");
  const testIdValue = testIdParam ? Number(testIdParam) : undefined;
  const testId = Number.isFinite(testIdValue) ? testIdValue : undefined;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const tagsQuery = useTagsQuery();
  const questionsQuery = useQuestionsQuery();
  const classroomsQuery = useClassroomsQuery();
  const testQuery = useTestQuery(testId);
  const createDraftMutation = useCreateTestMutation();
  const updateMutation = useUpdateTestMutation();
  const publishMutation = usePublishTestMutation();
  const scheduleMutation = useScheduleTestMutation();
  const draftCreationRequested = useRef(false);
  const createDraft = createDraftMutation.mutate;
  const updateTestRequest = updateMutation.mutateAsync;
  const publishTestRequest = publishMutation.mutateAsync;
  const scheduleTestRequest = scheduleMutation.mutateAsync;
  const availableQuestions = useMemo(
    () => QuestionFactory.from(questionsQuery.data ?? []),
    [questionsQuery.data],
  );

  const {
    tags,
    setTags,
    test,
    setTest,
    setAllocatedQuestions,
    sections,
    setSections,
    updateSection,
    questions,
    setQuestions,
    testName,
    setTestName,
    testValue,
    setTestValue,
    testDescription,
    setTestDescription,
    testDueDate,
    setTestDueDate,
    testDuration,
    setTestDuration,
    publishDate,
    setPublishDate,
    enablePublishDate,
    setEnablePublishDate,
    setEnableDueDate,
    setClassrooms,
    selectedClassrooms,
    setSelectedClassrooms,
    setAutoSaveStatus,
  } = createTestContext;

  const buildCurrentTestData = useCallback(
    (status: TestData["status"]): TestData => ({
      name: testName,
      value: testValue,
      description: testDescription,
      dueDate: testDueDate,
      duration: testDuration,
      publishDate,
      sections,
      classroomIds: selectedClassrooms,
      status,
    }),
    [
      testName,
      testValue,
      testDescription,
      testDueDate,
      testDuration,
      publishDate,
      sections,
      selectedClassrooms,
    ],
  );

  const refetchUpdatedQuestions = useCallback(
    async (id: number) => {
      const res = await queryClient.fetchQuery({
        queryKey: queryKeys.question(id),
        queryFn: () => getQuestion(id),
        staleTime: 0,
      });
      if (!res) return;
      return QuestionFactory.from([res])[0];
    },
    [queryClient],
  );

  useEffect(() => {
    if (
      testId !== undefined ||
      createDraftMutation.data ||
      createDraftMutation.isPending ||
      draftCreationRequested.current
    ) {
      return;
    }

    draftCreationRequested.current = true;
    createDraft({
      status: "draft",
      sections: [],
    });
  }, [
    createDraftMutation.data,
    createDraftMutation.isPending,
    createDraft,
    testId,
  ]);

  useEffect(() => {
    if (tagsQuery.data) {
      setTags(tagsQuery.data);
    }
  }, [setTags, tagsQuery.data]);

  useEffect(() => {
    if (questionsQuery.data) {
      setQuestions(availableQuestions);
    }
  }, [availableQuestions, questionsQuery.data, setQuestions]);

  useEffect(() => {
    if (classroomsQuery.data) {
      setClassrooms(classroomsQuery.data.ownedClasses);
    }
  }, [classroomsQuery.data, setClassrooms]);

  const loadedTest = testId !== undefined ? testQuery.data : createDraftMutation.data;

  useEffect(() => {
    if (!loadedTest || !questionsQuery.data) return;

    const serverSections = Array.isArray(loadedTest.sections)
      ? (loadedTest.sections as unknown as SectionFromServer[])
      : [];

    if (testId === undefined) {
      navigate({ search: `?test=${loadedTest.id}` }, { replace: true });
    }

    setTest({
      id: loadedTest.id,
      name: loadedTest.name,
      value: loadedTest.value,
      description: loadedTest.description || "",
      dueDate: loadedTest.dueDate || undefined,
      duration: loadedTest.timer || 0,
      publishDate: loadedTest.publishDate || undefined,
      sections: serverSections.map<Section>((section) => ({
        shuffle: section.shuffle || false,
        questions: section.questions.flatMap((question) => {
          const item = availableQuestions.find(
            (availableQuestion) => availableQuestion.id === question.questionId,
          );
          return item ? [item as IQuestion] : [];
        }),
        selectionMode: section.count ? "random" : "all",
        randomQuestionCount: section.count,
        id: Math.random().toString(),
      })),
      classroomIds: loadedTest.classroomId ? [loadedTest.classroomId] : [],
      status: loadedTest.status as TestData["status"],
    });
  }, [
    availableQuestions,
    loadedTest,
    navigate,
    questionsQuery.data,
    setTest,
    testId,
  ]);

  useEffect(() => {
    if (test && test.sections) {
      setSections(test.sections);
      const allocatedQuestions = new Map<number, string>();
      test.sections.forEach((section) => {
        section.questions.forEach((q) =>
          allocatedQuestions.set(q.id, section.id),
        );
      });
      setAllocatedQuestions(allocatedQuestions);
    }
  }, [test, setSections, setAllocatedQuestions]);

  useEffect(() => {
    setTestName(test?.name || "");
    setTestValue(test?.value || 10);
    setTestDescription(test?.description || "");
    setTestDueDate(test?.dueDate || undefined);
    setTestDuration(test?.duration || 0);
    setPublishDate(test?.publishDate || undefined);
    setEnablePublishDate(Boolean(test?.publishDate));
    setEnableDueDate(Boolean(test?.dueDate));
    setSelectedClassrooms(test?.classroomIds ? test.classroomIds : []);
  }, [
    test,
    setEnableDueDate,
    setEnablePublishDate,
    setPublishDate,
    setSelectedClassrooms,
    setTestDescription,
    setTestDueDate,
    setTestDuration,
    setTestName,
    setTestValue,
  ]);

  useEffect(() => {
    const channel = new BroadcastChannel("question-change");

    channel.onmessage = async (e) => {
      const section = sections.find((s) =>
        s.questions.some((q) => q.id === e.data.questionId),
      );

      if (e.data.type == "update") {
        const updated = await refetchUpdatedQuestions(e.data.questionId);
        if (!updated) return;

        setQuestions((prev: IQuestion[]) => {
          const newQuestions = prev.map((q: IQuestion) =>
            q.id === e.data.questionId ? updated : q,
          );
          return newQuestions;
        });
        void queryClient.invalidateQueries({ queryKey: queryKeys.questions });

        if (!section) return;

        const sectionQuestions = section.questions.map((q) =>
          q.id === e.data.questionId ? updated : q,
        );
        updateSection({
          ...section,
          questions: sectionQuestions,
        });

        infoToast("Uma questão foi atualizada pois foi alterada em outra aba");
      } else if (e.data.type == "delete") {
        setQuestions((prev: IQuestion[]) => {
          const newQuestions = prev.filter(
            (q: IQuestion) => q.id !== e.data.questionId,
          );
          return newQuestions;
        });
        void queryClient.invalidateQueries({ queryKey: queryKeys.questions });

        if (!section) return;

        const sectionQuestions = section.questions.filter(
          (q) => q.id !== e.data.questionId,
        );
        updateSection({
          ...section,
          questions: sectionQuestions,
        });

        infoToast(
          "Uma questão foi removida da prova pois foi deletada do banco de questões em outra aba",
        );
      }
    };

    return () => {
      channel.close();
    };
  }, [
    queryClient,
    refetchUpdatedQuestions,
    sections,
    setQuestions,
    updateSection,
  ]);

  const handleSave = useCallback(
    async (autoSave: boolean = false) => {
      if (!test?.id) return false;

      const result = validateAndFormat(
        buildCurrentTestData("draft"),
        true,
        enablePublishDate,
      );

      if (!result.valid && "errors" in result) {
        const text = "Erros: \n - " + result.errors.join("\n - ");
        errorToast(text);
        return false;
      }

      if (!("data" in result)) return false;

      try {
        const data = await updateTestRequest({
          testId: test.id,
          data: result.data,
        });

        if (!data) {
          throw new Error("O backend não retornou a prova salva");
        }

        if (autoSave) {
          setAutoSaveStatus(new Date());
          return true;
        }

        successToast("Rascunho salvo com sucesso");
        return true;
      } catch (error) {
        setAutoSaveStatus(null);
        if (!autoSave) {
          errorToast(getApiErrorMessage(error, "Erro ao salvar rascunho"));
        }
        return false;
      }
    },
    [
      buildCurrentTestData,
      enablePublishDate,
      setAutoSaveStatus,
      test?.id,
      updateTestRequest,
    ],
  );

  const saveTestData = useCallback(() => {
    setAutoSaveStatus("saving");
    void handleSave(true);
  }, [handleSave, setAutoSaveStatus]);

  const debounceSave = useDebounce(saveTestData, 5000);

  // auto save
  useEffect(() => {
    if (testName) debounceSave();
  }, [
    testName,
    testValue,
    testDescription,
    testDueDate,
    testDuration,
    publishDate,
    sections,
    debounceSave,
  ]);

  const getValidatedData = (status: TestData['status']) => {
    const result = validateAndFormat(
      buildCurrentTestData(status),
      false,
      enablePublishDate,
    );

    if (!result.valid && "errors" in result) {
      const text = "Erros: \n - " + result.errors.join("\n - ");
      errorToast(text);
      return;
    }

    if (!("data" in result)) return;

    return result.data;
  };

  const handlePublish = async () => {
    const data = getValidatedData("published");
    if (!data || !test?.id) return;

    if (!(await handleSave(true))) return;

    try {
      const response = await publishTestRequest({
        testId: test.id,
        classroomIds: data.classroomIds ?? [],
      });
      if (!response) throw new Error("O backend não retornou as provas publicadas");
      successToast("Prova publicada com sucesso");
    } catch (error) {
      errorToast(getApiErrorMessage(error, "Erro ao criar prova"));
      return;
    }

    // redirect to test page
    navigate("/provas");
  };

  const handleSchedulePublish = async () => {
    const data = getValidatedData("scheduled");

    if (!data || !test?.id) return;

    if (!(await handleSave(true))) return;

    try {
      const response = await scheduleTestRequest({
        testId: test.id,
        classroomIds: data.classroomIds ?? [],
      });
      if (!response) throw new Error("O backend não retornou a prova agendada");
      successToast("Prova agendada com sucesso");
    } catch (error) {
      errorToast(getApiErrorMessage(error, "Erro ao agendar publicação da prova"));
      return;
    }

    // redirect to test page
    navigate("/provas");
  };

  const handleAddClassroom = (classroom: Classroom) => {
    if (selectedClassrooms.includes(classroom.id)) return;

    setSelectedClassrooms((prev) => [...prev, classroom.id]);
  };

  const loading =
    questionsQuery.isPending ||
    tagsQuery.isPending ||
    classroomsQuery.isPending ||
    (testId !== undefined && testQuery.isPending) ||
    (testId === undefined && !createDraftMutation.data && !createDraftMutation.error);
  const error =
    questionsQuery.error ||
    tagsQuery.error ||
    classroomsQuery.error ||
    testQuery.error ||
    createDraftMutation.error;
  const refetch = async () => {
    await Promise.all([
      questionsQuery.refetch(),
      tagsQuery.refetch(),
      classroomsQuery.refetch(),
      testId === undefined ? Promise.resolve() : testQuery.refetch(),
    ]);

    if (testId === undefined && !createDraftMutation.data) {
      draftCreationRequested.current = false;
      createDraftMutation.reset();
      createDraftMutation.mutate({ status: "draft", sections: [] });
    }
  };

  return {
    tags,
    questions,
    setQuestions,
    test,
    handleAddClassroom,
    handlePublish,
    handleSchedulePublish,
    handleSave,
    loading,
    error,
    refetch,
  };
}
