import type { CreateUploadRequest, PresignedPostResponse } from "api-contracts";
import { backendJson } from "./backend-api";

export function requestPresignedUpload(contentType: string) {
  const body: CreateUploadRequest = { contentType };
  return backendJson<PresignedPostResponse>("/api/upload", {
    method: "POST",
    body,
  });
}

export type UploadProgressHandler = (percentage: number) => void;

/**
 * Sends a file directly to the object store using the API-provided form
 * fields. The browser owns this request; application cookies are never sent
 * to the presigned URL.
 */
export function uploadToPresignedPost(
  upload: PresignedPostResponse,
  file: File,
  onProgress?: UploadProgressHandler,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof XMLHttpRequest === "undefined") {
      reject(new Error("File uploads are only available in a browser"));
      return;
    }

    const request = new XMLHttpRequest();
    const formData = new FormData();

    Object.entries(upload.fields).forEach(([key, value]) => {
      formData.append(key, value);
    });
    formData.append("file", file);

    request.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable) return;
      onProgress?.(Math.round((event.loaded * 100) / event.total));
    });

    request.addEventListener("load", () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress?.(100);
        resolve();
        return;
      }

      reject(new Error(`Presigned upload failed with status ${request.status}`));
    });
    request.addEventListener("error", () => {
      reject(new Error("The browser could not reach the presigned upload URL"));
    });
    request.addEventListener("abort", () => {
      reject(new Error("The file upload was cancelled"));
    });

    try {
      request.open("POST", upload.url);
      request.withCredentials = false;
      request.send(formData);
    } catch (error) {
      reject(error instanceof Error ? error : new Error("Could not start file upload"));
    }
  });
}
