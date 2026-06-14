"use client";

import { Button } from "@/app/components/ui/button";
import { useCreateTest } from "@/app/context/create-test-context";
import { MdAdd } from "react-icons/md";
import { TestSection } from "./test-section";

export const QuestionsSection = () => {
  const { sections, addSection } = useCreateTest();

  return (
    <div>
      <h1 className="font-semibold mb-2">Questões</h1>
      <div className="flex flex-col gap-4">
        {sections.map((section, index) => (
          <TestSection key={section.id} number={index + 1} section={section} />
        ))}
        <Button
          className="mx-auto bg-verdigris-400 hover:bg-verdigris-300"
          onClick={addSection}
        >
          <MdAdd /> Adicionar seção de questões
        </Button>
      </div>
    </div>
  );
};
