import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  backendFetch,
  backendJson,
  getBackendBaseUrl,
  setUnauthorizedHandler,
} from "./backend-api";

beforeEach(() => {
  vi.stubEnv("VITE_BACKEND_URL", "");
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("backend API client", () => {
  it("uses the Vite backend URL and removes trailing slashes", () => {
    vi.stubEnv("VITE_BACKEND_URL", "http://localhost:8000///");

    expect(getBackendBaseUrl()).toBe("http://localhost:8000");
  });

  it("uses same-origin requests and serializes JSON bodies", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const data = await backendJson<{ ok: boolean }>("/api/questions", {
      method: "POST",
      body: { type: "multiple-choice" },
    });

    expect(data).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/questions",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({ type: "multiple-choice" }),
      }),
    );
    const requestOptions = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(requestOptions.headers).get("Content-Type")).toBe(
      "application/json",
    );
  });

  it("turns API errors into ApiError with the response payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Invalid question" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(backendJson("/api/questions")).rejects.toMatchObject({
      name: "ApiError",
      status: 400,
      message: "Invalid question",
      payload: { error: "Invalid question" },
    });
  });

  it("notifies the injected unauthorized handler and rethrows", async () => {
    const unauthorizedHandler = vi.fn();
    const cleanup = setUnauthorizedHandler(unauthorizedHandler);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(backendFetch("/api/auth/me")).rejects.toBeInstanceOf(ApiError);
    expect(unauthorizedHandler).toHaveBeenCalledOnce();
    expect(unauthorizedHandler.mock.calls[0]?.[0]).toMatchObject({
      status: 401,
      message: "Unauthorized",
    });

    cleanup();
  });

  it("reports invalid JSON responses as ApiError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("not-json", { status: 200 })),
    );

    await expect(backendJson("/api/questions")).rejects.toMatchObject({
      name: "ApiError",
      status: 200,
      message: "Backend returned an invalid JSON response",
    });
  });
});
