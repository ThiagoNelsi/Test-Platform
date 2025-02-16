import { MultipleChoiceQuestion } from "@/app/types";
import { Separator } from "../../ui/separator";

export default function MultipleChoiceRenderer({ content }: { content: MultipleChoiceQuestion }) {
    const { statement, options } = content

    return (
        <div>
            <div className="flex flex-col gap-5">
                <p className="font-medium text-sm">Enunciado</p>
                <div dangerouslySetInnerHTML={{ __html: statement }} />
            </div>
            <Separator className="my-5" />
            <p className="font-medium text-sm mb-5">Alternativas</p>
            <div className="flex flex-col gap-2">
                {options && options.map((option: any, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                        <input type="checkbox" checked={option.isCorrect} onChange={() => {}} />
                        <div dangerouslySetInnerHTML={{ __html: option.value || "" }} />
                    </div>
                ))}
            </div>
        </div>
    )
}