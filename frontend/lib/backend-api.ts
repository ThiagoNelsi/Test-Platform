export type UnauthorizedHandler = (error: ApiError) => void;

export class ApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(status: number, message: string, payload?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

export function getApiErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  return error instanceof ApiError ? error.message : fallbackMessage;
}

type BackendRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  handleUnauthorized?: boolean;
};

let unauthorizedHandler: UnauthorizedHandler | undefined;

export function setUnauthorizedHandler(
  handler: UnauthorizedHandler | undefined,
): () => void {
  unauthorizedHandler = handler;

  return () => {
    if (unauthorizedHandler === handler) {
      unauthorizedHandler = undefined;
    }
  };
}

export function getBackendBaseUrl() {
  return (import.meta.env?.VITE_BACKEND_URL ?? "").trim().replace(/\/+$/g, "");
}

async function readPayload(response: Response): Promise<unknown> {
  try {
    return await response.clone().json();
  } catch {
    return null;
  }
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }

  return fallback;
}

function handleHttpError(
  response: Response,
  payload: unknown,
  shouldHandleUnauthorized: boolean,
): never {
  const fallback = `Backend request failed with status ${response.status}`;
  const error = new ApiError(
    response.status,
    getErrorMessage(payload, fallback),
    payload,
  );

  if (response.status === 401 && shouldHandleUnauthorized) {
    unauthorizedHandler?.(error);
  }

  throw error;
}

export async function backendFetch(
  path: string,
  options: BackendRequestOptions = {},
) {
  const backendBase = getBackendBaseUrl();
  const { body: requestBody, handleUnauthorized = true, ...requestOptions } = options;

  const headers = new Headers(requestOptions.headers);

  let body: BodyInit | undefined;
  if (requestBody !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(requestBody);
  }

  const response = await fetch(`${backendBase}${path}`, {
    ...requestOptions,
    headers,
    body,
    credentials: requestOptions.credentials ?? "include",
    cache: requestOptions.cache ?? "no-store",
  });

  if (!response.ok) {
    const payload = await readPayload(response);
    handleHttpError(response, payload, handleUnauthorized);
  }

  return response;
}

export async function backendJson<T>(
  path: string,
  options: BackendRequestOptions = {},
): Promise<T> {
  const response = await backendFetch(path, options);

  let data: T;
  try {
    data = (await response.json()) as T;
  } catch (error) {
    throw new ApiError(
      response.status,
      "Backend returned an invalid JSON response",
      error,
    );
  }

  return data;
}
