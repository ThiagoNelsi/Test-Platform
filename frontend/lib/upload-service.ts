import type {
  CreateUploadRequest,
  CreateUploadResponse,
  PresignedPostResponse,
} from "api-contracts";
import { backendJson } from "./backend-api";

export function requestPresignedUpload(request: CreateUploadRequest) {
  return backendJson<CreateUploadResponse>("/api/upload", {
    method: "POST",
    body: request,
  });
}

export async function calculateFileSha256(file: Blob): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export type UploadProgressHandler = (percentage: number) => void;

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

    Object.entries(upload.fields).forEach(([key, value]) => formData.append(key, value));
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
    request.addEventListener("error", () => reject(
      new Error("The browser could not reach the presigned upload URL"),
    ));
    request.addEventListener("abort", () => reject(new Error("The file upload was cancelled")));

    try {
      request.open("POST", upload.uploadUrl || upload.url);
      request.withCredentials = false;
      request.send(formData);
    } catch (error) {
      reject(error instanceof Error ? error : new Error("Could not start file upload"));
    }
  });
}
