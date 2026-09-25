import type {
  CreateResourceRequest,
  CreateResourceResponse,
  ResourceDto,
  ResourceStatus,
  ResourcesResponse,
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

export async function getResources(status?: ResourceStatus): Promise<Resource[]> {
  const path = status
    ? `/api/resource?status=${encodeURIComponent(status)}`
    : "/api/resource";
  const response = await backendJson<ResourcesResponse>(path);

  return response.resources.map(hydrateResource);
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
