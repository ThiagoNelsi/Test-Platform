import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/app/components/ui/collapsible";
import { useState } from "react";
import { IoClose } from "react-icons/io5";
import { MdKeyboardArrowDown, MdKeyboardArrowUp } from "react-icons/md";
import { motion } from "framer-motion";
import { FaArrowDown, FaArrowUp } from "react-icons/fa";
import { Section, useCreateTest } from "@/app/context/create-test-context";
import { QuestionSection } from "./question-section";

type TestSectionProps = {
  number: number;
  section: Section;
};

export const TestSection = ({ number, section }: TestSectionProps) => {
  const { removeSection, moveSection } = useCreateTest();
  const [open, setOpen] = useState(true);

  return (
    <Collapsible
      className="bg-gray-100 p-6 rounded-lg"
      open={open}
      onOpenChange={setOpen}
    >
      <CollapsibleTrigger className="w-full flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2 text-xl">
          {open ? <MdKeyboardArrowUp /> : <MdKeyboardArrowDown />}
          <div className="flex flex-col gap-1 items-start">
            <h1 className="font-semibold">Seção {number}</h1>
            <p className="text-xs">
              {section.questions.length}{" "}
              {section.questions.length === 1 ? "questão" : "questões"}
            </p>
          </div>
        </div>
        <div
          className="flex items-center gap-8"
          onClick={(e) => e.stopPropagation()}
        >
          <span
            onClick={() => removeSection(section)}
            className="flex items-center text-sm gap-2 hover:underline cursor-pointer"
          >
            <IoClose /> Remover esta seção
          </span>
          <div>
            <FaArrowUp
              className="mb-2 text-neutral-700 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                moveSection(section, "up");
              }}
            />
            <FaArrowDown
              className="text-neutral-700 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                moveSection(section, "down");
              }}
            />
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <motion.div
          className="flex flex-col gap-2"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: open ? 1 : 0, height: open ? "auto" : 0 }}
          transition={{ duration: 0.3 }}
        >
          <QuestionSection section={section} />
        </motion.div>
      </CollapsibleContent>
    </Collapsible>
  );
};
