
import { useResourcesQuery } from "@/src/hooks/use-api-queries";

export const useMaterialsController = (deleted = false) => {
  const query = useResourcesQuery(undefined, deleted);

  return {
    resources: query.data ?? [],
    loading: query.isPending,
    error: query.error,
    refetch: query.refetch,
  };
};
