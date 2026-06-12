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

  const headers = new Headers(options.headers);

  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.body);
  }

  const response = fetch(`${backendBase}${path}`, {
    ...options,
    headers,
    body,
    credentials: options.credentials ?? "include",
    cache: options.cache ?? "no-store",
  });

  response.then(console.log).catch(console.error);

  return response;
}

export async function backendJson<T>(
  path: string,
  options: BackendRequestOptions = {},
): Promise<{ ok: boolean; status: number; data: T | null }> {
  const response = await backendFetch(path, options);

  let data: T | null = null;
  try {
    data = (await response.json()) as T;
  } catch (error) {
    console.error("Failed to parse JSON response:", error);
    data = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}
