import { ClassroomWithOwner, getClassrooms } from "@/lib/classroomService";
import { errorToast } from "@/lib/toasters";
import { tryCatch } from "@/lib/try-catch";
import { useEffect, useState } from "react";

export const useHomeController = () => {
  const [ownedClasses, setOwnedClasses] = useState<ClassroomWithOwner[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await tryCatch(getClassrooms());

      if (error || !data) {
        errorToast("Erro ao carregar turmas");
      }

      setOwnedClasses(data?.ownedClasses || []);
    }

    fetchData();
  }, []);

  return {
    ownedClasses,
    setOwnedClasses,
  }
}