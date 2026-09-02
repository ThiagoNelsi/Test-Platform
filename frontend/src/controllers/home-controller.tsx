import { useClassroomsQuery } from "@/src/hooks/use-api-queries";

export const useHomeController = () => {
  const query = useClassroomsQuery();

  return {
    ownedClasses: query.data?.ownedClasses ?? [],
    loading: query.isPending,
    error: query.error,
    refetch: query.refetch,
  };
};
