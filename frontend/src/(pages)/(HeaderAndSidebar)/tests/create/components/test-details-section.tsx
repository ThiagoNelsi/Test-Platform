
import { AutosizeTextarea } from "@/src/components/ui/auto-resize-textarea";
import { DatePicker } from "@/src/components/ui/date-picker";
import { Input } from "@/src/components/ui/input";
import SearchClassrooms from "@/src/components/search-classrooms";
import { IoMdStopwatch } from "react-icons/io";
import { MdClose } from "react-icons/md";
import { DurationInput } from "./duration-input";
import { InputBlock } from "./input-block";
import { useCreateTest } from "@/src/context/create-test-context";
import type { Classroom } from "@/lib/classroomService";

type TestDetailsSectionProps = {
  handleAddClassroom: (classroom: Classroom) => void;
};

export const TestDetailsSection = ({
  handleAddClassroom,
}: TestDetailsSectionProps) => {
  const {
    autoSaveStatus,
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
    enableDueDate,
    setEnableDueDate,
    classrooms,
    selectedClassrooms,
    setSelectedClassrooms,
  } = useCreateTest();

  return (
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
            <DurationInput duration={testDuration} setDuration={setTestDuration} />
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
                    {classrooms.find((classroom) => classroom.id === classroomId)?.name}
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
          {classrooms.length > 0 && (
            <SearchClassrooms items={classrooms} onSelect={handleAddClassroom} />
          )}
          <span className="text-xs mt-2">
            Visando facilitar o gerenciamento das provas, ao selecionar múltiplas
            turmas o sistema irá gerar uma prova para cada turma separadamente.
            Exemplo:
          </span>
          <ul className="list-disc list-inside text-xs">
            <li>Prova I - Turma A</li>
            <li>Prova I - Turma B</li>
          </ul>
        </InputBlock>
      </div>
    </div>
  );
};
