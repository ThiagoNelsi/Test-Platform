"use server";

import { cookies } from "next/headers";

type BackendRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

function getBackendBaseUrl() {
  const base =
    process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

  return base.replace(/\/+$/g, "");
}

export async function backendFetch(
  path: string,
  options: BackendRequestOptions = {},
) {
  const backendBase = getBackendBaseUrl();
  if (!backendBase) {
    throw new Error("Backend URL is not configured");
  }

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;

  const headers = new Headers(options.headers);
  if (sessionCookie) {
    headers.set("cookie", `session=${sessionCookie}`);
  }

  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.body);
  }

  return fetch(`${backendBase}${path}`, {
    ...options,
    headers,
    body,
    cache: options.cache ?? "no-store",
  });
}

export async function backendJson<T>(
  path: string,
  options: BackendRequestOptions = {},
): Promise<{ ok: boolean; status: number; data: T | null }> {
  const response = await backendFetch(path, options);

  let data: T | null = null;
  try {
    data = (await response.json()) as T;
  } catch {
    data = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}
