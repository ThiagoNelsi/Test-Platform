
import TableActions from "./table-actions";
import { TableProvider } from "@/src/context/table-context";
import { QuestionEditorProvider } from "@/src/context/question-editor-context";
import { PossibleQuestionTypes, QuestionFactory } from "@/lib/question";
import { useEffect, useMemo, useState } from "react";
import SectionList from "./section-list";
import { useAppSearchParams } from "@/src/components/router-helpers";
import QuestionListingPrototype, {
  isQuestionPrototypeVariant,
} from "./prototype/question-listing-prototype";
import {
  useQuestionsQuery,
} from "@/src/hooks/use-api-queries";
import { QueryError, QueryLoading } from "@/src/components/query-state";

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
  const [searchParams] = useAppSearchParams();
  const variant = searchParams.get("variant");

  if (isQuestionPrototypeVariant(variant)) {
    return <QuestionListingPrototype mode="personal" variant={variant} />;
  }

  return <CurrentQuestionsPage />;
}

function CurrentQuestionsPage() {
  const questionsQuery = useQuestionsQuery();
  const questions = useMemo(
    () => QuestionFactory.from(questionsQuery.data ?? []),
    [questionsQuery.data],
  );
  const [search, setSearch] = useState("");
  const [groupBy, setGroupBy] = useState<keyof PossibleQuestionTypes | null>(
    null,
  );
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>([]);
  const [selectedSubSections, setSelectedSubSections] = useState<Set<string>>(
    new Set(),
  );

  const filteredQuestions = useMemo(() => {
    const searchValue = search.toLowerCase().trim();
    if (!searchValue) return questions;

    return questions.filter((question) =>
      question.getText().toLowerCase().includes(searchValue),
    );
  }, [questions, search]);

  const sections = useMemo<Sections>(() => {
    if (!groupBy) {
      return new Map([["Sem grupo", filteredQuestions]]);
    }

    const grouped = new Map<string, PossibleQuestionTypes[]>();

    filteredQuestions.forEach((question) => {
      if (groupBy === "tags") {
        const tags = question.tags;
        if (!tags || tags.length === 0) {
          const untagged = grouped.get("Sem tags") ?? [];
          untagged.push(question);
          grouped.set("Sem tags", untagged);
          return;
        }

        tags.forEach((tag) => {
          const tagged = grouped.get(tag.name) ?? [];
          tagged.push(question);
          grouped.set(tag.name, tagged);
        });
        return;
      }

      const groupValue = question[groupBy];
      const questionGroup = Array.isArray(groupValue)
        ? groupValue.join(", ") || "Sem grupo"
        : groupValue?.toString() || "Sem grupo";
      const group = grouped.get(questionGroup) ?? [];
      group.push(question);
      grouped.set(questionGroup, group);
    });

    return grouped;
  }, [filteredQuestions, groupBy]);

  const subSections = useMemo(
    () => (groupBy ? new Set(sections.keys()) : new Set<string>()),
    [groupBy, sections],
  );

  useEffect(() => {
    setSelectedSubSections(subSections);
  }, [subSections]);

  const toggleGroupBy = (option: keyof PossibleQuestionTypes | null) => {
    if (groupBy === option) {
      setGroupBy(null);
    } else {
      setGroupBy(option);
    }
  };

  if (questionsQuery.isPending) {
    return <QueryLoading message="Carregando questões..." />;
  }

  if (questionsQuery.error) {
    return (
      <QueryError
        message="Erro ao carregar questões."
        onRetry={questionsQuery.refetch}
        isRetrying={questionsQuery.isFetching}
      />
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
            search={search}
            setSearch={setSearch}
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
          {filteredQuestions.length === 0 && (
            <p className="rounded border border-dashed p-8 text-center text-sm text-muted-foreground">
              Nenhuma questão encontrada.
            </p>
          )}
        </div>
      </TableProvider>
    </QuestionEditorProvider>
  );
}
