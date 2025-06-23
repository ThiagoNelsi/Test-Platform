"use client";

import { Button } from "@/app/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { tryCatch } from "@/lib/try-catch";
import { errorToast } from "@/lib/toasters";
import { Resource } from "@/lib/types";
import ResourceCard from "./components/resource-card";

export default function Page() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchResources() {
      const { data: fetchResponse, error: fetchError } = await tryCatch(fetch("/api/resource"));
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
  }, []);
  if (loading) {
    return <div>Loading...</div>;
  }
  if (!resources || resources.length === 0) {
    return (
      <div>
        <h1>Meus Materiais</h1>
        <p>Nenhum material encontrado.</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Meus Materiais</h1>
      <Button className="mb-4 mt-4 bg-blue-500 hover:bg-blue-600 text-white">
        <Link href="/materiais/upload" className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Adicionar Material
        </Link>
      </Button>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {resources.map((resource) => (
          <ResourceCard key={resource.id} resource={resource} />
        ))}
      </div>
    </div>
  );
}
