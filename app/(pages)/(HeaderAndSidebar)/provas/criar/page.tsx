"use client";

import { getTags } from "@/lib/tag-service";
import { useEffect, useState } from "react";
import { IQuestion, Tag, TestData } from "@/lib/types";
import { getQuestions } from "@/lib/question-service";
import { QuestionFactory } from "@/lib/question";
import { CreateTestProvider, Section } from "@/app/context/create-test-context";
import CreateTestForm from "./create-test-form";
import { useSearchParams } from "next/navigation";
import { createTest, getTest } from "@/lib/test-service";

type SectionFromServer = {
  shuffle?: boolean;
  questions: {
    questionId: number;
    version: number;
  }[];
  count?: number;
};

export default function CreateTest() {
  const searchParams = useSearchParams();
  const testId = searchParams.get("test");
  const [tags, setTags] = useState<Tag[] | null>(null);
  const [questions, setQuestions] = useState<IQuestion[]>([]);
  const [test, setTest] = useState<TestData | null>(null);

  
  useEffect(() => {
    const fetchTest = async (questions: IQuestion[]) => {
      let res;
      if (testId) {
        res = await getTest(Number(testId));
      } else {
        res = await createTest({
          status: "draft",
          sections: [],
        });
      }
  
      if (!res) return;
      // set url to test id
      if (!testId) {
        window.history.replaceState({}, "", `?test=${res.id}`);
      }
  
      setTest({
        id: res.id,
        name: res.name,
        value: res.value,
        description: res.description || "",
        dueDate: res.dueDate || undefined,
        duration: res.timer || 0,
        publishDate: res.publishDate || undefined,
        sections: (res.sections as unknown as SectionFromServer[])?.map<Section>(
          (section) => {
            return {
              shuffle: section.shuffle || false,
              questions: section.questions
                .map((question) => {
                  return questions.find((q) => q.id === question.questionId);
                })
                .filter((q) => q !== undefined) as IQuestion[],
              selectionMode: section.count ? "random" : "all",
              randomQuestionCount: section.count,
              id: Math.random().toString(),
            };
          },
        ),
        classroomIds: [res.classroomId || 0],
        status: res.status as TestData["status"],
      });
      return;
    };

    const fetchData = async () => {
      getTags().then((tags) => setTags(tags));
      const res = await getQuestions();
      const questions = QuestionFactory.from(res);
      setQuestions(questions);
      fetchTest(questions);
    };

    fetchData();
  }, [testId]);


  if (!test) {
    return <div>Loading...</div>;
  }

  return (
    <CreateTestProvider
      tags={tags}
      questions={questions}
      setQuestions={setQuestions}
    >
      <CreateTestForm test={test} />
    </CreateTestProvider>
  );
}
