"use client"

import { Button } from "@/app/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/app/components/ui/dialog";
import { IQuestion, Tag } from "@/lib/types";
import { useContext, useState } from "react";
import { MdAdd } from "react-icons/md";
import { QuestionFinder } from "./question-finder";
import { QuestionSearchbar } from "./questions-searchbar";
import { Section, TestBuilderContext } from "./test-builder";
import SectionQuestions from "./section-questions";
import QuestionFinderDialog from "./question-finder-dialog";

type QuestionSectionProps = {
    section: Section;
}

export const QuestionSection = ({ section }: QuestionSectionProps) => {
    const { removeQuestion } = useContext(TestBuilderContext)

    const [open, setOpen] = useState<boolean>(false);

    const handleRemove = (question: IQuestion) => {
        removeQuestion(section, question)
    }

    if (section.questions.length && !open) {
        return <SectionQuestions section={section} setOpen={setOpen} onRemove={handleRemove} />
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="w-fit mt-2 bg-verdigris-400 hover:bg-verdigris-300">
                    <MdAdd /> Escolher questões
                </Button>
            </DialogTrigger>
            <QuestionFinderDialog section={section} setOpen={setOpen} />
        </Dialog>
    )
}