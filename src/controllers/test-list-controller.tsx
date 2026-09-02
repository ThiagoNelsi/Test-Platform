
import { useMemo } from "react";
import { useOwnedTestsQuery } from "@/src/hooks/use-api-queries";

export const useTestListController = () => {
  const query = useOwnedTestsQuery();
  const tests = useMemo(() => query.data ?? [], [query.data]);

  const groupedTests = useMemo(
    () => ({
      publishedTests: tests.filter((test) => test.status === "published"),
      scheduledTests: tests.filter((test) => test.status === "scheduled"),
      draftTests: tests.filter((test) => test.status === "draft"),
    }),
    [tests],
  );

  return {
    ...groupedTests,
    loading: query.isPending,
    error: query.error,
    refetch: query.refetch,
  };
};
