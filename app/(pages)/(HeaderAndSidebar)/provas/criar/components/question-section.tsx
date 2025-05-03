"use client";

import { Button } from "@/app/components/ui/button";
import { Dialog, DialogTrigger } from "@/app/components/ui/dialog";
import { IQuestion } from "@/lib/types";
import { useState } from "react";
import SectionQuestions from "./section-questions";
import QuestionFinderDialog from "./question-finder-dialog";
import { Section, useCreateTest } from "@/app/context/create-test-context";

type QuestionSectionProps = {
  section: Section;
};

export const QuestionSection = ({ section }: QuestionSectionProps) => {
  const { removeQuestion } = useCreateTest();

  const [open, setOpen] = useState<boolean>(false);

  const handleRemove = (question: IQuestion) => {
    removeQuestion(section, question);
  };

  if (section.questions.length && !open) {
    return (
      <SectionQuestions
        section={section}
        setOpen={setOpen}
        onRemove={handleRemove}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full mt-4 bg-transparent shadow-none text-primary border-[1px] p-10 border-primary hover:bg-blue-100 hover:border-blue-500">
          Clique para escolher questões
        </Button>
      </DialogTrigger>
      <QuestionFinderDialog section={section} setOpen={setOpen} />
    </Dialog>
  );
};
