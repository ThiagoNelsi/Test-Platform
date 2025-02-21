import { AutosizeTextarea } from "@/app/components/ui/auto-resize-textarea";
import { Button } from "@/app/components/ui/button";
import { DatePicker } from "@/app/components/ui/date-picker";
import { Input } from "@/app/components/ui/input";
import { IoIosRocket, IoMdStopwatch } from "react-icons/io";
import { SlNote } from "react-icons/sl";
import { TestBuilder } from "./components/test-builder";
import { getTags } from "@/lib/tag-service";
import { getQuestionTags } from "@/lib/questionService";

type InputBlockProps = {
    label: string;
    required?: boolean;
    children: React.ReactNode;
};

export type QuestionTags = {
    id: number;
    tags: {
        id: number;
    }[];
}

const InputBlock = ({ label, children, required }: InputBlockProps) => (
    <div className="flex flex-col gap-2">
        <label className="text-sm">
            {label}
            {required 
                ? <span className="text-red-500"> *</span>
                : <span className="text-xs"> (opcional)</span>
            }
        </label>
        {children}
    </div>
);

const DurationInput = () => {
    return (
        <div className="flex items-center gap-2 text-xs">
            <IoMdStopwatch className="text-base" />
            <div className="flex gap-2">
                <div>
                    <Input placeholder="Horas" className="bg-white w-24" type="number" min={0} max={99} />
                </div>
                <div>
                    <Input placeholder="Minutos" className="bg-white w-28" type="number" min={0} max={59} />
                </div>
            </div>
        </div>
    )
}

export default async function CreateTest() {
    const tags = await getTags();
    const questionTags = await getQuestionTags()

    return (
        <div className="flex flex-col gap-8 max-w-[800px] mx-auto py-6">
            <div>
                <h1 className="font-semibold mb-2">Nova prova</h1>
                <div className="flex flex-col gap-6 bg-gray-100 p-6 rounded-lg">
                    <div className="flex gap-10">
                        <div className="flex-[2]">
                            <InputBlock label="Nome da prova" required>
                                <Input className="bg-white" placeholder="Ex.: Prova I do semestre..." />
                            </InputBlock>
                        </div>
                        <div className="flex-[1]">
                            <InputBlock label="Valor" required>
                                <Input className="bg-white" defaultValue={10} type="number" min={0} />
                            </InputBlock>
                        </div>
                    </div>
                    <div className="flex gap-10">
                        <InputBlock label="Data de entrega">
                            <DatePicker />
                        </InputBlock>
                        <InputBlock label="Duração">
                            <DurationInput />
                        </InputBlock>
                    </div>
                    <InputBlock label="Descrição / Instrução aos alunos">
                        <AutosizeTextarea placeholder="Descrição da prova..." />
                    </InputBlock>
                </div>
            </div>

            <div>
                <h1 className="font-semibold mb-2">Questões</h1>
                {questionTags && <TestBuilder tags={tags} questionTags={questionTags} />}
            </div>

            <div>
                <h1 className="font-semibold mb-2">Publicação</h1>
                <div className="flex flex-col gap-6 bg-gray-100 p-6 rounded-lg">
                    <div className="flex gap-10">
                        <InputBlock label="Agendar publicação">
                            <DatePicker />
                        </InputBlock>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-6">
                <Button className="flex-[3] bg-verdigris-400 hover:bg-verdigris-300"><IoIosRocket /> Publicar</Button>
                <Button className="flex-[1] bg-gray-400 hover:bg-gray-500"><SlNote /> Salvar rascunho</Button>
            </div>
        </div>
    );
}