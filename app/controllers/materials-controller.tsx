"use client";

import { useEffect, useState } from "react";
import { tryCatch } from "@/lib/try-catch";
import { errorToast } from "@/lib/toasters";
import { Resource } from "@/lib/types";

export const useMaterialsController = () => {
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";
  const backendBase = backend.replace(/\/+$/g, "");
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchResources() {
      if (!backendBase) {
        errorToast("Backend URL is not configured");
        setLoading(false);
        return;
      }

      const { data: fetchResponse, error: fetchError } = await tryCatch(
        fetch(`${backendBase}/api/resource`, { credentials: "include" }),
      );
      if (fetchError || fetchResponse === null) {
        errorToast("Erro ao buscar materiais");
        setLoading(false);
        return;
      }

      const { data, error } = await tryCatch(fetchResponse.json());

      if (error) {
        setLoading(false);
        return;
      }

      setResources(data.resources);
      setLoading(false);
    }

    fetchResources();
  }, [backendBase]);

  return {
    resources,
    loading,
  }
}
