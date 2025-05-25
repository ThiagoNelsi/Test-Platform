"use client";

import { getQuestions } from "@/lib/question-service";
import TableActions from "./table-actions";
import { TableProvider } from "@/app/context/table-context";
import { QuestionEditorProvider } from "@/app/context/question-editor-context";
import { PossibleQuestionTypes, QuestionFactory } from "@/lib/question";
import { useEffect, useState } from "react";
import { errorToast } from "@/lib/toasters";
import { tryCatch } from "@/lib/try-catch";
import SectionList from "./section-list";

const groupByOptions: {
  label: string;
  value: keyof PossibleQuestionTypes;
}[] = [
  // { label: "Tipo", value: "type" },
  { label: "Tags", value: "tags" },
  { label: "Fonte", value: "source" },
  { label: "Dificuldade", value: "level" },
  { label: "Disciplina", value: "subjects" },
];

export type Sections = Map<string, PossibleQuestionTypes[]>;

export default function Page() {
  const [questions, setQuestions] = useState<PossibleQuestionTypes[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<
    PossibleQuestionTypes[]
  >([]);
  const [fetching, setFetching] = useState(false);
  const [groupBy, setGroupBy] = useState<keyof PossibleQuestionTypes | null>(
    null
  );
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>([]);
  const [sections, setSections] = useState<Sections>(new Map());
  const [subSections, setSubSections] = useState<Set<string>>(new Set());
  const [selectedSubSections, setSelectedSubSections] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    async function fetchData() {
      const { data, error } = await tryCatch(getQuestions());
      if (error) {
        errorToast("Erro ao carregar questões");
        setFetching(false);
        return;
      }
      setQuestions(QuestionFactory.from(data));
    }

    setFetching(true);

    fetchData()
      .then(() => setFetching(false))
      .catch((error) => {
        errorToast("Erro ao carregar questões");
        setFetching(false);
      });
  }, []);

  useEffect(() => {
    setFilteredQuestions(questions);
  }, [questions]);

  useEffect(() => {
    setSections(new Map());
    const newSections = new Map();
    const newSubSections = new Set<string>();

    if (!groupBy) {
      newSections.set("Sem grupo", filteredQuestions);
      setSections(newSections);
      setSubSections(newSubSections);
      return;
    }

    if (groupBy === "tags") return groupByTags();

    filteredQuestions.forEach((question) => {
      const groupValue = question[groupBy];
      let questionGroup = groupValue?.toString() || "Sem grupo";

      if (Array.isArray(groupValue)) {
        questionGroup = groupValue.join(", ") || "Sem grupo";
      }

      const existingSection = newSections.get(questionGroup);

      if (existingSection) {
        existingSection.push(question);
        return;
      }

      if (!newSubSections.has(questionGroup)) {
        newSubSections.add(questionGroup);
      }

      newSections.set(questionGroup, [question]);
    });
    setSections(newSections);
    setSubSections(newSubSections);
    setSelectedSubSections(newSubSections);
  }, [filteredQuestions, groupBy]);

  const groupByTags = () => {
    const newSections = new Map<string, PossibleQuestionTypes[]>();
    const newSubSections = new Set<string>();

    filteredQuestions.forEach((question) => {
      const tags = question.tags;

      if (!tags || tags.length === 0) {
        const existingSection = newSections.get("Sem tags");
        if (existingSection) {
          existingSection.push(question);
        } else {
          newSections.set("Sem tags", [question]);
        }

        if (!newSubSections.has("Sem tags")) {
          newSubSections.add("Sem tags");
        }
        return;
      }

      tags.forEach((tag) => {
        const existingSection = newSections.get(tag.name);

        if (existingSection) {
          existingSection.push(question);
        } else {
          newSections.set(tag.name, [question]);
        }

        if (!newSubSections.has(tag.name)) {
          newSubSections.add(tag.name);
        }
      });
    });
    setSections(newSections);
    setSubSections(newSubSections);
    setSelectedSubSections(newSubSections);
  };

  const toggleGroupBy = (option: keyof PossibleQuestionTypes | null) => {
    if (groupBy === option) {
      setGroupBy(null);
    } else {
      setGroupBy(option);
    }
  };

  if (!questions) return null;

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Carregando questões...</p>
      </div>
    );
  }

  return (
    <QuestionEditorProvider>
      <TableProvider>
        <div className="container mx-auto">
          <TableActions
            groupBy={groupBy}
            groupByOptions={groupByOptions}
            setGroupBy={toggleGroupBy}
            subSections={subSections}
            selectedSubSections={selectedSubSections}
            setSelectedSubSections={setSelectedSubSections}
            selectedQuestions={selectedQuestions}
            setSelectedQuestions={setSelectedQuestions}
            sections={sections}
            setSections={setSections}
            questions={questions}
            setQuestions={setQuestions}
            filteredQuestions={filteredQuestions}
            setFilteredQuestions={setFilteredQuestions}
          />
          {Array.from(sections.keys()).map(
            (section) =>
              (!groupBy || selectedSubSections.has(section)) && (
                <SectionList
                  key={section}
                  section={section}
                  questions={sections.get(section) || []}
                  defaultOpen={sections.size === 1}
                  groupBy={groupBy}
                  selectedQuestions={selectedQuestions}
                  setSelectedQuestions={setSelectedQuestions}
                />
              )
          )}
        </div>
      </TableProvider>
    </QuestionEditorProvider>
  );
}
