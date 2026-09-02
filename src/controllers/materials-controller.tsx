
import { useResourcesQuery } from "@/src/hooks/use-api-queries";

export const useMaterialsController = () => {
  const query = useResourcesQuery();

  return {
    resources: query.data ?? [],
    loading: query.isPending,
    error: query.error,
    refetch: query.refetch,
  };
};
