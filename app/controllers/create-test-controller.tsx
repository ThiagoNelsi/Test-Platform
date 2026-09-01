import { getTags } from "@/lib/tag-service";
import { useEffect, useCallback } from "react";
import { IQuestion, TestData } from "@/lib/types";
import { getQuestions } from "@/lib/question-service";
import { QuestionFactory } from "@/lib/question";
import { Section, useCreateTest } from "@/app/context/create-test-context";
import {
  useAppNavigate as useNavigate,
  useAppSearchParams as useSearchParams,
} from "@/app/components/router-compat";

import { errorToast, infoToast, successToast } from "@/lib/toasters";
import {
  createTest,
  DataParam,
  getTest,
  publishTest,
  scheduleTest,
  updateTest,
} from "@/lib/test-service";
import { getQuestion } from "@/lib/question-service";
import { getClassrooms, type Classroom } from "@/lib/classroomService";
import { useDebounce } from "@/app/hooks/useDebounce";
import { tryCatch } from "@/lib/try-catch";

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
  const testId = searchParams.get("test");
  const navigate = useNavigate();

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

  useEffect(() => {
    const fetchTest = async (questions: IQuestion[]) => {
      let res;
      if (testId) {
        res = await getTest(Number(testId));
      } else {
        res = await createTest({
          status: "draft",
          sections: [],
        });
      }

      if (!res) return;
      // set url to test id
      if (!testId) {
        navigate({ search: `?test=${res.id}` }, { replace: true });
      }

      setTest({
        id: res.id,
        name: res.name,
        value: res.value,
        description: res.description || "",
        dueDate: res.dueDate || undefined,
        duration: res.timer || 0,
        publishDate: res.publishDate || undefined,
        sections: (res.sections as unknown as SectionFromServer[])?.map<Section>(
          (section) => {
            return {
              shuffle: section.shuffle || false,
              questions: section.questions
                .map((question) => {
                  return questions.find((q) => q.id === question.questionId);
                })
                .filter((q) => q !== undefined) as IQuestion[],
              selectionMode: section.count ? "random" : "all",
              randomQuestionCount: section.count,
              id: Math.random().toString(),
            };
          },
        ),
        classroomIds: [res.classroomId || 0],
        status: res.status as TestData["status"],
      });
      return;
    };

    const fetchData = async () => {
      getTags().then((tags) => setTags(tags));
      const res = await getQuestions();
      const questions = QuestionFactory.from(res);
      setQuestions(questions);
      fetchTest(questions);
    };

    fetchData();
  }, [navigate, testId, setQuestions, setTags, setTest]);

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

        if (!section) return;

        const sectionQuestions = section.questions.map((q) =>
          q.id === e.data.questionId ? updated : q,
        );
        updateSection(
          {
            ...section,
            questions: sectionQuestions,
          },
          "create-test-form",
        );

        infoToast("Uma questão foi atualizada pois foi alterada em outra aba");
      } else if (e.data.type == "delete") {
        setQuestions((prev: IQuestion[]) => {
          const newQuestions = prev.filter(
            (q: IQuestion) => q.id !== e.data.questionId,
          );
          return newQuestions;
        });

        if (!section) return;

        const sectionQuestions = section.questions.filter(
          (q) => q.id !== e.data.questionId,
        );
        updateSection(
          {
            ...section,
            questions: sectionQuestions,
          },
          "create-test-form",
        );

        infoToast(
          "Uma questão foi removida da prova pois foi deletada do banco de questões em outra aba",
        );
      }
    };

    return () => {
      channel.close();
    };
  }, [sections, questions, updateSection, setQuestions]);

  const handleSave = useCallback(
    async (autoSave: boolean = false) => {
      if (!test?.id) return;

      const result = validateAndFormat(
        buildCurrentTestData("draft"),
        true,
        enablePublishDate,
      );

      if (!result.valid && "errors" in result) {
        const text = "Erros: \n - " + result.errors.join("\n - ");
        errorToast(text);
        return;
      }

      if (!("data" in result)) return;

      const { data, error } = await tryCatch(updateTest(test?.id, result.data));

      if (!data || error) {
        if (autoSave) return;
        errorToast("Erro ao salvar rascunho");
      }

      if (autoSave) return setAutoSaveStatus(new Date());

      return successToast("Rascunho salvo com sucesso");
    },
    [test?.id, buildCurrentTestData, enablePublishDate, setAutoSaveStatus],
  );

  const saveTestData = useCallback(() => {
    setAutoSaveStatus("saving");
    handleSave(true);
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

  useEffect(() => {
    const fetchClassrooms = async () => {
      const res = await getClassrooms();
      if (!res) return;
      setClassrooms(res.ownedClasses);
    };

    fetchClassrooms();
  }, [setClassrooms]);

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

  const refetchUpdatedQuestions = async (id: number) => {
    const res = await getQuestion(id);
    if (!res) return;
    const updated = QuestionFactory.from([res])[0];
    return updated;
  };

  const handlePublish = async () => {
    const data = getValidatedData("published");
    if (!data || !test?.id) return;

    const { error } = await tryCatch(handleSave(true));
    if (error) return;

    const response = await tryCatch(publishTest(
      test?.id,
      data.classroomIds as number[],
    ));

    if (!response.data || response.error) return errorToast("Erro ao criar prova");
    successToast("Prova publicada com sucesso");

    // redirect to test page
    navigate("/provas");
  };

  const handleSchedulePublish = async () => {
    const data = getValidatedData("scheduled");

    if (!data || !test?.id) return;

    const { error } = await tryCatch(handleSave(true));
    if (error) return;

    const response = await tryCatch(scheduleTest(
      test?.id,
      data.classroomIds as number[],
    ));
    if (!response.data || response.error) return errorToast("Erro ao agendar publicação da prova");
    successToast("Prova publicada com sucesso");

    // redirect to test page
    navigate("/provas");
  };

  const handleAddClassroom = (classroom: Classroom) => {
    if (selectedClassrooms.includes(classroom.id)) return;

    setSelectedClassrooms((prev) => [...prev, classroom.id]);
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
  };
}
