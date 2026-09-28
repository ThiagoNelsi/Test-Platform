import type {
  CreateResourceRequest,
  CreateResourceResponse,
  ResourceDto,
  ResourceStatus,
  ResourcesResponse,
  UpdateResourceRequest,
  ResourceResponse,
  ResourceFileResponse,
  ApiOkResponse,
} from "api-contracts";
import { backendJson } from "./backend-api";
import type { Resource } from "./types";

function hydrateResource(resource: ResourceDto): Resource {
  return {
    ...resource,
    createdAt: new Date(resource.createdAt),
    updatedAt: new Date(resource.updatedAt),
    deletedAt: resource.deletedAt ? new Date(resource.deletedAt) : null,
    processedAt: resource.processedAt ? new Date(resource.processedAt) : null,
  };
}

export async function getResources(status?: ResourceStatus, deleted = false): Promise<Resource[]> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (deleted) params.set("deleted", "true");
  const path = `/api/resource${params.size ? `?${params}` : ""}`;
  const response = await backendJson<ResourcesResponse>(path);

  return response.resources.map(hydrateResource);
}

export async function updateResource(id: number, data: UpdateResourceRequest): Promise<Resource> {
  const response = await backendJson<ResourceResponse>(`/api/resource/${id}`, { method: "PATCH", body: data });
  return hydrateResource(response.resource);
}

export function deleteResource(id: number) {
  return backendJson<ApiOkResponse>(`/api/resource/${id}`, { method: "DELETE" });
}

export function restoreResource(id: number) {
  return backendJson<ApiOkResponse>(`/api/resource/${id}/restore`, { method: "POST" });
}

export function getResourceFile(id: number, download = false, signal?: AbortSignal) {
  return backendJson<ResourceFileResponse>(`/api/resource/${id}/file${download ? "?download=true" : ""}`, { signal });
}

export async function createResource(
  request: CreateResourceRequest,
): Promise<Resource> {
  const response = await backendJson<CreateResourceResponse>("/api/resource", {
    method: "POST",
    body: request,
  });

  return hydrateResource(response.resource);
}
