import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Resource } from "@/lib/types";
import { getResourceFile } from "@/lib/resource-service";
import { renderMaterialPreview } from "@/lib/material-preview";
import { FileIconComponent } from "../utils";

export default function MaterialPreview({ resource }: { resource: Resource }) {
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const supported = ["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(resource.fileType);
  const available = supported && !resource.deletedAt && resource.status !== "PENDING_UPLOAD" && resource.status !== "EXPIRED";

  useEffect(() => {
    if (!available || !container.current) return;
    if (!("IntersectionObserver" in window)) { setVisible(true); return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, [available]);

  const preview = useQuery({
    queryKey: ["material-preview", resource.ownerId, resource.id, resource.objectKey],
    enabled: available && visible,
    queryFn: async ({ signal }) => {
      const timeout = AbortSignal.any([signal, AbortSignal.timeout(15_000)]);
      const { url } = await getResourceFile(resource.id, false, timeout);
      return renderMaterialPreview(url, resource.fileType, timeout);
    },
    staleTime: Infinity,
    gcTime: 5 * 60 * 1000,
    retry: false,
  });

  return (
    <div ref={container} className="flex h-[88px] w-16 shrink-0 self-start items-center justify-center overflow-hidden rounded-md border bg-muted/30" aria-busy={preview.isFetching}>
      {available && preview.data ? (
        <img src={preview.data} alt={`Prévia de ${resource.filename}`} className="h-full w-full object-contain" />
      ) : (
        <div className={preview.isFetching ? "animate-pulse" : ""} aria-hidden="true"><FileIconComponent fileType={resource.fileType} /></div>
      )}
    </div>
  );
}
