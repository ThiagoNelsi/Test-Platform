"use client"

import { getOwnedTests } from "@/lib/test-service";
import { errorToast } from "@/lib/toasters";
import { tryCatch } from "@/lib/try-catch";
import { useEffect, useState } from "react";

type TestItem = {
  status?: string;
};

export const useTestListController = () => {
  const [tests, setTests] = useState<TestItem[]>([]);

  useEffect(() => {
    const fetchTests = async () => {
      const { data: tests, error } = await tryCatch(getOwnedTests());

      if (error || !tests) errorToast("Erro ao buscar as provas");

      setTests(tests as TestItem[]);
    }
    fetchTests();
  }, []);


  return {
    publishedTests: tests.filter((test) => test.status === "published"),
    scheduledTests: tests.filter((test) => test.status === "scheduled"),
    draftTests: tests.filter((test) => test.status === "draft"),
  };
}
