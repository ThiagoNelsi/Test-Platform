"use client";

import { IQuestion, Tag } from "@/lib/types";
import { useEffect, useState } from "react";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { Button } from "@/app/components/ui/button";
import { Section, useCreateTest } from "@/app/context/create-test-context";
import MultipleChoiceCard from "@/app/components/question-types/multiple-choice/card";
import { MultipleChoiceQuestion } from "@/lib/multiple-choice-question";

type QuestionFinderProps = {
  selected: IQuestion[];
  maxSelections?: number;
  searchTerm: string;
  selectedTags: Tag[];
  section: Section;
};

export const QuestionFinder = ({
  section,
  selected,
  searchTerm,
  selectedTags,
  maxSelections = Infinity,
}: QuestionFinderProps) => {
  const {
    allocatedQuestions,
    sections,
    removeQuestion,
    questions,
    addQuestion,
  } = useCreateTest();

  const [filteredQuestions, setFilteredQuestions] = useState<IQuestion[]>([]);

  useEffect(() => {
    if (!questions) return;

    const filteredByTag = questions.filter((question) => {
      return (
        selectedTags.length === 0 ||
        question.tags.some((tag) => {
          return selectedTags.some((selectedTag) => selectedTag.id === tag.id);
        })
      );
    });

    const filteredBySearch = filteredByTag.filter((question) => {
      return question
        .getText()
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    });
    setFilteredQuestions(filteredBySearch);
  }, [searchTerm, selectedTags, questions]);

  const handleSelect = (question: IQuestion) => {
    const allocated = allocatedQuestions.get(question.id);
    if (allocated && allocated !== section.id) return;

    if (selected.some((q) => q.id === question.id)) {
      removeQuestion(section, question);
      return;
    }

    if (maxSelections && selected.length >= maxSelections) return;

    addQuestion(section, question);
  };

  const handleBringQuestion = (
    question: IQuestion,
    sectionNumber: number | null
  ) => {
    if (sectionNumber === null) return;

    removeQuestion(sections[sectionNumber - 1], question);
    addQuestion(section, question);
  };

  if (!questions) return <div>Carregando questões...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      {filteredQuestions.length === 0 ? (
        <div className="col-span-full text-center text-gray-500">
          Nenhuma questão encontrada.
        </div>
      ) : (
        filteredQuestions.map((question) => {
          const allocated = allocatedQuestions.get(question.id);
          const allocatedSection = sections.find((s) => s.id === allocated);
          const sectionNumber = allocatedSection
            ? sections.indexOf(allocatedSection) + 1
            : null;
          const q = selected.find((q) => q.id === question.id);
          const index = q ? selected.indexOf(q) : -1;

          return (
            <div className="relative group mb-4" key={question.id}>
              {index > -1 && (
                <div className="absolute top-0 right-0 -translate-x-1/4  translate-y-1/4  rounded-full bg-blue-500 text-white font-bold flex items-center justify-center w-8 h-8 z-50 border-2 border-white shadow-lg">
                  {index + 1}
                </div>
              )}
              <ScrollArea
                roundChildren="none"
                onClick={() => handleSelect(question)}
                className={
                  "[&>[data-radix-scroll-area-viewport]>div]:h-full h-full max-h-[400px] bg-white shadow-md p-0 rounded-xl cursor-pointer w-full" +
                  (selected.some((q) => q.id === question.id)
                    ? " border-2 border-blue-500"
                    : " border-0")
                }
              >
                {allocated && allocated !== section.id && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-100 bg-opacity-80
                                                opacity-0 translate-y-4 transition-all duration-300 ease-in-out group-hover:opacity-100 group-hover:translate-y-0"
                  >
                    <div className="absolute inset-0 backdrop-blur-[2px]"></div>

                    <div className="relative text-center px-4 py-2">
                      <p className="px-2 py-0.5 font-medium text-lg">
                        Questão alocada na Seção {sectionNumber}
                      </p>
                      <p className="text-sm font-normal p-4 mb-5">
                        Esta questão já foi reservada na seção {sectionNumber},
                        para utilizá-la aqui será necessário removê-la da outra
                        seção.
                      </p>
                      <Button
                        onClick={() =>
                          handleBringQuestion(question, sectionNumber)
                        }
                      >
                        Mover para cá
                      </Button>
                    </div>
                  </div>
                )}
                <MultipleChoiceCard
                  alwaysOpen={true}
                  question={question as MultipleChoiceQuestion}
                  showTags={true}
                />
              </ScrollArea>
            </div>
          );
        })
      )}
    </div>
  );
};
