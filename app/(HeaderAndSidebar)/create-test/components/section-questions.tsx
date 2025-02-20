import { Button } from "@/app/components/ui/button";
import { MdAutorenew } from "react-icons/md";
import { Section } from "./test-builder";
import { IoClose } from "react-icons/io5";
import QuestionRenderer from "@/app/components/question-renderer";
import { IQuestion } from "@/lib/types";

type SectionQuestionsProps = {
    section: Section;
    setOpen: (open: boolean) => void;
    onRemove: (question: IQuestion) => void;
}

export default function SectionQuestions({ section, setOpen, onRemove }: SectionQuestionsProps) {
    return (
        <div className="flex flex-col gap-8">
            <div className="flex gap-2 mt-4">
                <Button
                    onClick={() => setOpen(true)}
                    className="bg-verdigris-400 hover:bg-verdigris-300"
                >
                    <MdAutorenew /> Trocar / Adicionar questões
                </Button>
            </div>
            <div className="flex flex-col gap-10">
                {section.questions.map((question, index) => (
                    <div key={question.id} className="relative">
                        <div onClick={() => onRemove(question)} className="absolute right-5 top-5 cursor-pointer text-lg">
                            <IoClose />
                        </div>
                        <div className="flex gap-2">
                            <p className="mt-1">{index + 1}. </p>
                            <div
                                key={question.id}
                                className="mb-2 overflow-auto border-2 p-4 rounded-lg cursor-pointer w-full"
                            >
                                <QuestionRenderer key={question.id} question={question} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}