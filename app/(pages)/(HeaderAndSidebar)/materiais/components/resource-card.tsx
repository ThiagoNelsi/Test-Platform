import { Resource, ResourceStatus } from "@/lib/types";
import { getFileIcon } from "../utils";
import { Button } from "@/app/components/ui/button";
import { Sparkles, Trash } from "lucide-react";
import Confirm from "@/app/components/ui/confirm";
import Link from "next/link";

const statuses: Record<ResourceStatus, string> = {
  UPLOADED: "Enviado",
  PROCESSING: "Processando...",
  PROCESSED: "Pronto para usar",
  FAILED: "Erro",
};

const badgeStyles: Record<ResourceStatus, string> = {
  UPLOADED: "bg-blue-100 text-blue-800",
  PROCESSING: "bg-yellow-100 text-yellow-800",
  PROCESSED: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
};

export default function ResourceCard({ resource }: { resource: Resource }) {
  return (
    <div className="flex items-center gap-6 p-4 bg-white rounded-xl shadow-md border border-gray-200">
      <div className="flex items-start h-full w-5">
        {getFileIcon({
          type: resource.fileType,
        } as File)}
      </div>
      <div className="flex-1 flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between">
          <h2
            className={`text-sm font-semibold truncate ${
              resource.status === "FAILED" ? "line-through text-gray-400" : ""
            }`}
          >
            {resource.filename}
          </h2>
          {resource.status !== "PROCESSED" && (
            <span
              className={`min-w-24 text-center px-3 py-1 rounded-full text-xs font-medium ${
                badgeStyles[resource.status]
              }`}
            >
              {statuses[resource.status]}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {resource.tags.map((tag) => (
            <span
              key={tag}
              className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="text-xs"
            onClick={() => alert("Função não implementada.")}
            disabled={resource.status === "FAILED"}
          >
            Abrir
          </Button>
          <Button
            variant="outline"
            className="text-xs"
            disabled={resource.status !== "PROCESSED"}
          >
            <Link href={`/questoes/criar?tab=ai&resourceId=${resource.id}`} className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 mr-2" />
              Gerar questões sobre esse material
            </Link>
          </Button>
          <Confirm
            title="Excluir Material"
            description={`Você tem certeza que deseja excluir o material "${resource.filename}"?`}
            onConfirm={() => alert("Função não implementada.")}
            confirmText="Excluir"
          >
            <Button
              variant="ghost"
              className="text-xs"
            >
              <Trash className="w-4 h-4" />
            </Button>
          </Confirm>
        </div>
      </div>
    </div>
  );
}
