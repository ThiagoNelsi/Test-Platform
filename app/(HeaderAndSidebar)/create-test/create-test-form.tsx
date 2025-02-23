import { AutosizeTextarea } from "@/app/components/ui/auto-resize-textarea";
import { Button } from "@/app/components/ui/button";
import { DatePicker } from "@/app/components/ui/date-picker";
import { Input } from "@/app/components/ui/input";
import { IoIosRocket, IoMdStopwatch } from "react-icons/io";
import { SlNote } from "react-icons/sl";
import { useCreateTest } from "@/app/context/create-test-context";
import { TestSection } from "./components/test-section";
import { MdAdd } from "react-icons/md";
import { useEffect, useState } from "react";
import { errorToast } from "@/lib/toasters";
import { TestData } from "@/lib/types";
import { createTest, DataParam } from "@/lib/test-service";

type InputBlockProps = {
    label: React.ReactNode;
    required?: boolean;
    children: React.ReactNode;
};

const InputBlock = ({ label, children, required }: InputBlockProps) => (
    <div className="flex flex-col gap-2">
        <label className="text-sm flex items-center gap-2">
            {label}
            {required 
                ? <span className="text-red-500"> *</span>
                : <span className="text-xs"> (opcional)</span>
            }
        </label>
        {children}
    </div>
);

const DurationInput = ({ duration, setDuration }: { duration: number, setDuration: (d: number) => void }) => {
    const [hours, setHours] = useState<number>(0)
    const [minutes, setMinutes] = useState<number>(0)

    useEffect(() => {
        setDuration(hours * 60 + minutes)
    }, [hours, minutes])

    useEffect(() => {
        setHours(Math.floor(duration / 60))
        setMinutes(duration % 60)
    }, [duration])

    return (
        <div className="flex items-center gap-2 text-xs">
            <div className="flex gap-2">
                <div>
                    <Input
                        value={hours}
                        onChange={(e) => Number(e.target.value) < 100 && setHours(Number(e.target.value))}
                        className="bg-white w-16"
                        type="number"
                        min={0}
                        max={99}
                    />
                    <p className="ml-2">Horas</p>
                </div>
                <p className="text-lg mt-1">:</p>
                <div>
                    <Input
                        value={minutes}
                        onChange={(e) => Number(e.target.value) < 60 && setMinutes(Number(e.target.value))}
                        className="bg-white w-16"
                        type="number"
                        min={0}
                        max={59}
                    />
                    <p className="ml-2">Minutos</p>
                </div>
            </div>
            {duration > 0 
            ? <p className="flex flex-col gap-1 text-xs text-neutral-700 -translate-y-1 ml-2">
                <span>
                    Ao acessar a prova o aluno terá{" "}
                    <strong>
                        {hours > 0 ? `${hours} hora${hours > 1 ? "s" : ""}` : ""}
                        {hours > 0 && minutes > 0 ? " e " : ""}
                        {minutes > 0 ? `${minutes} minuto${minutes > 1 ? "s" : ""}` : ""}
                    </strong>{" "}
                    para concluí-la
                </span>
                <span className="underline cursor-pointer" onClick={() => {
                    setDuration(0)
                    setHours(0)
                    setMinutes(0)
                }}>Remover limite</span>
            </p>
            : <p className="text-xs text-neutral-700">Sem limite de tempo</p>
            }
        </div>
    )
}

const validateAndFormat = (data: TestData) => {
    const errors = []

    if (!data.name) errors.push("Nome da prova é obrigatório")
    if (!data.value) errors.push("Valor da prova é obrigatório")
    if (data.dueDate) {
        if (data.dueDate.getTime() < new Date().getTime()) errors.push("Data de entrega inválida")
        if (data.publishDate && data.publishDate.getTime() > data.dueDate.getTime()) errors.push("Data de publicação não pode ser posterior à data de entrega")
    }
    if (data.publishDate && data.publishDate.getTime() < new Date().getTime()) errors.push("Data de publicação inválida")
    if (!data.classroomId) errors.push("Turma não definida")

    // sections
    data.sections.forEach((section, index) => {
        if (section.questions.length === 0) errors.push(`Seção ${index + 1}: Nenhuma questão selecionada`)
        else if (section.selectionMode === "random") {
            if (!section.randomQuestionCount) errors.push(`Seção ${index + 1}: Número de questões aleatórias não definido`)
            else {
                if (section.randomQuestionCount > section.questions.length) errors.push(`Seção ${index + 1}: Número de questões aleatórias maior que o número de questões disponíveis`)
                if (section.randomQuestionCount < 1) errors.push(`Seção ${index + 1}: Número de questões aleatórias inválido`)
            }
        }
    })

    if (errors.length > 0) return {
        valid: false,
        errors
    }

    const formatted: { valid: boolean, data: DataParam } = {
        valid: true,
        data: {
            name: data.name,
            value: data.value,
            description: data.description,
            dueDate: data.dueDate,
            duration: data.duration,
            publishDate: data.publishDate,
            classroomId: data.classroomId,
            status: data.status,
            sections: data.sections.map(section => ({
                questions: section.questions.map(q => ({
                    id: q.id,
                    version: q.version
                })),
                selectionMode: section.selectionMode || "all",
                shuffle: section.shuffle,
                randomQuestionCount: section.randomQuestionCount
            }))
        }
    }

    return formatted
}

export default function CreateTestForm() {
    const { sections, addSection } = useCreateTest()

    const [testName, setTestName] = useState<string>("")
    const [testValue, setTestValue] = useState<number>(10)
    const [testDescription, setTestDescription] = useState<string>("")
    const [testDueDate, setTestDueDate] = useState<Date | undefined>(undefined)
    const [testDuration, setTestDuration] = useState<number>(0)
    const [publishDate, setPublishDate] = useState<Date | undefined>(undefined)

    const [enablePublishDate, setEnablePublishDate] = useState<boolean>(false)
    const [enableDueDate, setEnableDueDate] = useState<boolean>(false)

    const handleSubmit = async (draft: boolean) => {
        const result = validateAndFormat({
            name: testName,
            value: testValue,
            description: testDescription,
            dueDate: testDueDate,
            duration: testDuration,
            publishDate,
            sections,
            classroomId: 1,
            status: draft ? "draft" : "published"
        })

        if (!result.valid && 'errors' in result) {
            const text = "Erros: \n - " + result.errors.join("\n - ")
            errorToast(text)
            return;
        }

        if (!('data' in result)) return

        try {
            const response = await createTest(result.data)
            console.log(response)
        } catch (err) {
            console.error(err)
            errorToast("Erro ao criar prova")
        }
    }

    return (
        <div className="flex flex-col gap-8 max-w-[800px] mx-auto py-6">
            <div>
                <h1 className="font-semibold mb-2">Nova prova</h1>
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
                        <InputBlock label={(
                            <>
                                <input
                                    type="checkbox"
                                    checked={enableDueDate}
                                    onChange={() => {
                                        setEnableDueDate(!enableDueDate)
                                        setTestDueDate(undefined)
                                    }}
                                    id="dueDate"
                                />
                                <label htmlFor="dueDate">Data de entrega</label>
                            </>
                        )}>
                            <DatePicker
                                date={testDueDate}
                                setDate={setTestDueDate}
                                disabled={!enableDueDate}
                            />
                        </InputBlock>
                        <InputBlock label={(
                            <>
                                <IoMdStopwatch />
                                <span>Duração</span>
                            </>
                        )}>
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
                </div>
            </div>

            <div>
                <h1 className="font-semibold mb-2">Questões</h1>
                <div className="flex flex-col gap-4">
                    {sections.map((section, index) => (
                        <TestSection key={section.id} number={index + 1} section={section} />
                    ))}
                    <Button className="w-64 bg-verdigris-400 hover:bg-verdigris-300" onClick={addSection}><MdAdd /> Adicionar seção de questões</Button>
                </div>
            </div>

            <div>
                <h1 className="font-semibold mb-2">Publicação</h1>
                <div className="flex flex-col gap-6 bg-gray-100 p-6 rounded-lg">
                    <div className="flex gap-10">
                        <InputBlock label={
                            <>
                                <input
                                    type="checkbox"
                                    checked={enablePublishDate}
                                    onChange={() => setEnablePublishDate(!enablePublishDate)}
                                    id="publishDate"
                                />
                                <label htmlFor="publishDate">Agendar publicação</label>
                            </>
                        }>
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
                <Button onClick={() => handleSubmit(false)} className="flex-[3] bg-verdigris-400 hover:bg-verdigris-300"><IoIosRocket /> Publicar</Button>
                <Button onClick={() => handleSubmit(true)} className="flex-[1] bg-gray-400 hover:bg-gray-500"><SlNote /> Salvar rascunho</Button>
            </div>
        </div>
    )
}