"use client";

import { Button } from "@/app/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getFileIcon } from "./utils";

const statuses = {
  UPLOADED: "Enviando",
  PROCESSING: "Processando",
  PROCESSED: "Pronto para usar",
  FAILED: "Erro"
} as const;

export default function Page() {
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchResources() {
      const response = await fetch("/api/resource");
      const data = await response.json();
      setResources(data.resources);
      setLoading(false);
    }

    fetchResources();
  }, []);
  if (loading) {
    return <div>Loading...</div>;
  }
  if (resources.length === 0) {
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
      <div className="grid gap-4">
        {resources.map((resource) => (
          <div className="flex items-center gap-4" key={resource.id}>
            {getFileIcon({
              type: resource.fileType
            } as File)}
            <div className="border p-4 rounded-md bg-white">
              <h2 className="text-lg font-semibold">{resource.filename}</h2>
              {resource.status !== 'PROCESSED' && <p className="flex items-center gap-4">{statuses[resource.status]}</p>}
              <p>{resource.tags.join(", ")}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
