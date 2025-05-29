import { AutosizeTextarea } from "@/app/components/ui/auto-resize-textarea";
import { Button } from "@/app/components/ui/button";
import { DatePicker } from "@/app/components/ui/date-picker";
import { Input } from "@/app/components/ui/input";
import { IoIosRocket, IoMdStopwatch } from "react-icons/io";
import { SlNote } from "react-icons/sl";
import { useCreateTest } from "@/app/context/create-test-context";
import { TestSection } from "./components/test-section";
import { MdAdd, MdClose } from "react-icons/md";
import { useCallback, useEffect, useState } from "react";
import { errorToast, infoToast, successToast } from "@/lib/toasters";
import { IQuestion, TestData } from "@/lib/types";
import {
  DataParam,
  publishTest,
  scheduleTest,
  updateTest,
} from "@/lib/test-service";
import { getQuestion } from "@/lib/question-service";
import { QuestionFactory } from "@/lib/question";
import { Classroom } from "@prisma/client";
import { getClassrooms } from "@/lib/classroomService";
import SearchClassrooms from "@/app/components/search-classrooms";
import { useDebounce } from "@/app/hooks/useDebounce";
import { useRouter } from "next/navigation";
import { tryCatch } from "@/lib/try-catch";

type InputBlockProps = {
  label: React.ReactNode;
  required?: boolean;
  children: React.ReactNode;
};

const InputBlock = ({ label, children, required }: InputBlockProps) => (
  <div className="flex flex-col gap-2">
    <label className="text-sm flex items-center gap-2">
      {label}
      {required ? (
        <span className="text-red-500"> *</span>
      ) : (
        <span className="text-xs"> (opcional)</span>
      )}
    </label>
    {children}
  </div>
);

const DurationInput = ({
  duration = 0,
  setDuration,
}: {
  duration: number;
  setDuration: (d: number) => void;
}) => {
  const [hours, setHours] = useState<number>(
    duration > 0 ? Math.floor(duration / 60) : 0,
  );
  const [minutes, setMinutes] = useState<number>(
    duration > 0 ? duration % 60 : 0,
  );

  useEffect(() => {
    setDuration(hours * 60 + minutes);
  }, [hours, minutes]);

  useEffect(() => {
    setHours(Math.floor(duration / 60));
    setMinutes(duration % 60);
  }, [duration]);

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="flex gap-2">
        <div>
          <Input
            value={hours}
            onChange={(e) =>
              Number(e.target.value) < 100 && setHours(Number(e.target.value))
            }
            className="bg-white w-16"
            type="number"
            min={0}
            max={99}
          />
          <p className="ml-2 mt-1">Horas</p>
        </div>
        <p className="text-lg mt-1">:</p>
        <div>
          <Input
            value={minutes}
            onChange={(e) =>
              Number(e.target.value) < 60 && setMinutes(Number(e.target.value))
            }
            className="bg-white w-16"
            type="number"
            min={0}
            max={59}
          />
          <p className="ml-2 mt-1">Minutos</p>
        </div>
      </div>
      {duration > 0 ? (
        <p className="flex flex-col gap-1 text-xs text-neutral-700 -translate-y-1 ml-2">
          <span>
            Após iniciar a prova o aluno terá{" "}
            <strong>
              {hours > 0 ? `${hours} hora${hours > 1 ? "s" : ""}` : ""}
              {hours > 0 && minutes > 0 ? " e " : ""}
              {minutes > 0 ? `${minutes} minuto${minutes > 1 ? "s" : ""}` : ""}
            </strong>{" "}
            para concluí-la
          </span>
          <span
            className="underline cursor-pointer"
            onClick={() => {
              setDuration(0);
              setHours(0);
              setMinutes(0);
            }}
          >
            Remover limite
          </span>
        </p>
      ) : (
        <p className="text-xs text-neutral-700">Sem limite de tempo</p>
      )}
    </div>
  );
};

const validateAndFormat = (data: TestData, isDraft: boolean) => {
  console.log(isDraft);
  const errors = [];

  if (!data.name) errors.push("Nome da prova é obrigatório");

  if (!isDraft) {
    if (!data.value) errors.push("Valor da prova é obrigatório");
    if (data.dueDate) {
      if (data.dueDate.getTime() < new Date().getTime())
        errors.push("Data de entrega inválida");
      if (
        data.publishDate &&
        data.publishDate.getTime() > data.dueDate.getTime()
      )
        errors.push(
          "Data de publicação não pode ser posterior à data de entrega",
        );
    }
    if (data.publishDate && data.publishDate.getTime() < new Date().getTime())
      errors.push("Data de publicação inválida");
    if (data.classroomIds.length < 1) errors.push("Turma não definida");

    // sections
    if (data.sections.length === 0)
      errors.push("Nenhuma seção de questões definida");
    data.sections.forEach((section, index) => {
      if (section.questions.length === 0)
        errors.push(`Seção ${index + 1}: Nenhuma questão selecionada`);
      else if (section.selectionMode === "random") {
        if (!section.randomQuestionCount)
          errors.push(
            `Seção ${index + 1}: Número de questões aleatórias não definido`,
          );
        else {
          if (section.randomQuestionCount > section.questions.length)
            errors.push(
              `Seção ${index + 1}: Número de questões aleatórias maior que o número de questões disponíveis`,
            );
          if (section.randomQuestionCount < 1)
            errors.push(
              `Seção ${index + 1}: Número de questões aleatórias inválido`,
            );
        }
      }
    });
  }

  if (errors.length > 0)
    return {
      valid: false,
      errors,
    };

  const formatted: { valid: boolean; data: DataParam } = {
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
        questions: section.questions.map((q) => ({
          id: q.id,
          version: q.version,
        })),
        selectionMode: section.selectionMode || "all",
        shuffle: section.shuffle,
        randomQuestionCount: section.randomQuestionCount,
      })),
    },
  };

  return formatted;
};

export default function CreateTestForm({ test }: { test: TestData | null }) {
  const router = useRouter();

  const {
    sections,
    setSections,
    addSection,
    setQuestions,
    questions,
    updateSection,
    setAllocatedQuestions,
  } = useCreateTest();

  const [testId, setTestId] = useState<number | null>(test?.id || null);
  const [testName, setTestName] = useState<string>(test?.name || "");
  const [testValue, setTestValue] = useState<number>(test?.value || 10);
  const [testDescription, setTestDescription] = useState<string>(
    test?.description || "",
  );
  const [testDueDate, setTestDueDate] = useState<Date | undefined>(
    test?.dueDate || undefined,
  );
  const [testDuration, setTestDuration] = useState<number>(test?.duration || 0);
  const [publishDate, setPublishDate] = useState<Date | undefined>(
    test?.publishDate || undefined,
  );
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedClassrooms, setSelectedClassrooms] = useState<number[]>([]);

  const [enablePublishDate, setEnablePublishDate] = useState<boolean>(
    Boolean(test?.publishDate),
  );
  const [enableDueDate, setEnableDueDate] = useState<boolean>(
    Boolean(test?.dueDate),
  );

  const [autoSaveStatus, setAutoSaveStatus] = useState<"saving" | Date | null>(
    null,
  );

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
  }, [test]);

  useEffect(() => {
    const channel = new BroadcastChannel("question-change");

    channel.onmessage = async (e) => {
      const section = sections.find((s) =>
        s.questions.some((q) => q.id === e.data.questionId),
      );

      if (e.data.type == "update") {
        const updated = await refetchUpdatedQuestions(e.data.questionId);
        if (!updated) return;

        setQuestions((prev: any) => {
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
        setQuestions((prev: any) => {
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
  }, [sections, questions]);

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
  ]);

  useEffect(() => {
    const fetchClassrooms = async () => {
      const res = await getClassrooms();
      if (!res) return;
      setClassrooms(res.ownedClasses);
    };

    fetchClassrooms();
  }, []);

  const getValidatedData = (status: TestData['status']) => {
    const result = validateAndFormat(
      {
        name: testName,
        value: testValue,
        description: testDescription,
        dueDate: testDueDate,
        duration: testDuration,
        publishDate,
        sections,
        classroomIds: selectedClassrooms,
        status,
      },
      false,
    );

    if (!result.valid && "errors" in result) {
      const text = "Erros: \n - " + result.errors.join("\n - ");
      errorToast(text);
      return;
    }

    if (!("data" in result)) return;

    return result.data;
  }

  const refetchUpdatedQuestions = async (id: number) => {
    const res = await getQuestion(id);
    if (!res) return;
    const updated = QuestionFactory.from([res])[0];
    return updated;
  };

  const handleSave = async (autoSave: boolean = false) => {
    if (!testId) return;

    const result = validateAndFormat(
      {
        name: testName,
        value: testValue,
        description: testDescription,
        dueDate: testDueDate,
        duration: testDuration,
        publishDate,
        sections,
        classroomIds: selectedClassrooms,
        status: "draft",
      },
      true,
    );

    if (!result.valid && "errors" in result) {
      const text = "Erros: \n - " + result.errors.join("\n - ");
      errorToast(text);
      return;
    }

    if (!("data" in result)) return;

    const { data, error } = await tryCatch(updateTest(testId, result.data));

    if (!data || error) {
      if (autoSave) return;
      errorToast("Erro ao salvar rascunho");
    }

    if (autoSave) return setAutoSaveStatus(new Date());

    return successToast("Rascunho salvo com sucesso");
  };

  const handlePublish = async () => {
    const data = getValidatedData("published");
    if (!data || !testId) return;

    const { error } = await tryCatch(handleSave(true));
    if (error) return;

    const response = await tryCatch(publishTest(
      testId,
      data.classroomIds as number[],
    ));

    if (!response.data || response.error) return errorToast("Erro ao criar prova");
    successToast("Prova publicada com sucesso");

    // redirect to test page
    router.push("/provas");
  };

  const handleSchedulePublish = async () => {
    const data = getValidatedData("scheduled");

    if (!data || !testId) return;

    const { error } = await tryCatch(handleSave(true));
    if (error) return;

    const response = await tryCatch(scheduleTest(
      testId,
      data.classroomIds as number[],
    ));
    if (!response.data || response.error) return errorToast("Erro ao agendar publicação da prova");
    successToast("Prova publicada com sucesso");

    // redirect to test page
    router.push("/provas");
  };

  const saveTestData = useCallback(() => {
    setAutoSaveStatus("saving");
    handleSave(true);
  }, [handleSave]);
  const debounceSave = useDebounce(saveTestData, 5000);

  const handleAddClassroom = (classroom: Classroom) => {
    if (selectedClassrooms.includes(classroom.id)) return;

    setSelectedClassrooms((prev) => [...prev, classroom.id]);
  };

  return (
    <div className="flex flex-col gap-8 max-w-[800px] mx-auto py-6 px-5">
      <div>
        <div className="flex items-center justify-between">
          {autoSaveStatus === "saving" ? (
            <p className="text-xs text-neutral-700">Salvando...</p>
          ) : (
            autoSaveStatus && (
              <p className="text-xs text-neutral-700">
                Salvo às {autoSaveStatus.toLocaleTimeString()}
              </p>
            )
          )}
        </div>
        <div className="flex flex-col gap-6 bg-gray-100 p-6 rounded-lg">
          <div className="flex gap-10">
            <div className="flex-[2]">
              <InputBlock label="Nome da prova" required>
                <Input
                  className="bg-white"
                  placeholder="Ex.: Prova I do semestre..."
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                />
              </InputBlock>
            </div>
            <div className="flex-[1]">
              <InputBlock label="Valor" required>
                <Input
                  className="bg-white"
                  type="number"
                  min={0}
                  value={testValue}
                  onChange={(e) => setTestValue(Number(e.target.value))}
                />
              </InputBlock>
            </div>
          </div>
          <div className="flex gap-10">
            <InputBlock
              label={
                <>
                  <input
                    type="checkbox"
                    checked={enableDueDate}
                    onChange={() => {
                      setEnableDueDate(!enableDueDate);
                      setTestDueDate(undefined);
                    }}
                    id="dueDate"
                  />
                  <label htmlFor="dueDate">Data de entrega</label>
                </>
              }
            >
              <DatePicker
                date={testDueDate}
                setDate={setTestDueDate}
                disabled={!enableDueDate}
              />
            </InputBlock>
            <InputBlock
              label={
                <>
                  <IoMdStopwatch />
                  <span>Duração</span>
                </>
              }
            >
              <DurationInput
                duration={testDuration}
                setDuration={setTestDuration}
              />
            </InputBlock>
          </div>
          <InputBlock label="Descrição / Instrução aos alunos">
            <AutosizeTextarea
              value={testDescription}
              onChange={(e) => setTestDescription(e.target.value)}
              placeholder="Descrição da prova..."
            />
          </InputBlock>
          <InputBlock label="Turma(s)" required>
            {selectedClassrooms.length > 0 && (
              <div className="flex gap-2 mb-1">
                {selectedClassrooms.map((classroomId) => (
                  <div
                    key={classroomId}
                    className="flex items-center gap-2 px-4 py-1 bg-verdigris-900 rounded-full border-2 border-verdigris-400"
                  >
                    <span className="text-sm">
                      {classrooms.find((c) => c.id === classroomId)?.name}
                    </span>
                    <button
                      onClick={() =>
                        setSelectedClassrooms(
                          selectedClassrooms.filter((id) => id !== classroomId),
                        )
                      }
                    >
                      <MdClose />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {classrooms && classrooms.length > 0 && (
              <SearchClassrooms
                items={classrooms}
                onSelect={handleAddClassroom}
              />
            )}
            <span className="text-xs mt-2">
              Visando facilitar o gerenciamento das provas, ao selecionar
              múltiplas turmas o sistema irá gerar uma prova para cada turma
              separadamente. Exemplo:
            </span>
            <ul className="list-disc list-inside text-xs">
              <li>Prova I - Turma A</li>
              <li>Prova I - Turma B</li>
            </ul>
          </InputBlock>
        </div>
      </div>

      <div>
        <h1 className="font-semibold mb-2">Questões</h1>
        <div className="flex flex-col gap-4">
          {sections.map((section, index) => (
            <TestSection
              key={section.id}
              number={index + 1}
              section={section}
            />
          ))}
          <Button
            className="mx-auto bg-verdigris-400 hover:bg-verdigris-300"
            onClick={addSection}
          >
            <MdAdd /> Adicionar seção de questões
          </Button>
        </div>
      </div>

      <div>
        <h1 className="font-semibold mb-2">Publicação</h1>
        <div className="flex flex-col gap-6 bg-gray-100 p-6 rounded-lg">
          <div className="flex gap-10">
            <InputBlock
              label={
                <>
                  <input
                    type="checkbox"
                    checked={enablePublishDate}
                    onChange={() => setEnablePublishDate(!enablePublishDate)}
                    id="publishDate"
                  />
                  <label htmlFor="publishDate">Agendar publicação</label>
                </>
              }
            >
              <DatePicker
                fromDate={new Date()}
                date={publishDate}
                defaultTime="08:00"
                setDate={setPublishDate}
                disabled={!enablePublishDate}
              />
            </InputBlock>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {
          enablePublishDate && publishDate
          ? <Button
              onClick={handleSchedulePublish}
              className="flex-[3] bg-verdigris-400 hover:bg-verdigris-300"
            >
              <IoIosRocket /> Agendar publicação
            </Button>
          : <Button
              onClick={handlePublish}
              className="flex-[3] bg-verdigris-400 hover:bg-verdigris-300"
            >
              <IoIosRocket /> Publicar prova
            </Button>
        }
        <Button
          onClick={() => handleSave(false)}
          className="flex-[1] bg-gray-400 hover:bg-gray-500"
        >
          <SlNote /> Salvar rascunho
        </Button>
      </div>
    </div>
  );
}
