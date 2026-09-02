import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useAuthMock = vi.hoisted(() => vi.fn());

vi.mock("@/src/hooks/useAuth", () => ({ useAuth: useAuthMock }));

vi.mock("./layouts", () => ({
  AuthenticatedLayout: () => null,
  NotFoundPage: () => null,
  RootLayout: () => null,
  RouteLoading: () => <p role="status">Carregando...</p>,
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );

  return {
    ...actual,
    Navigate: ({ to }: { to: string }) => (
      <p data-route="navigate">{to}</p>
    ),
    Outlet: () => <p data-route="outlet">protected content</p>,
  };
});

import { ProtectedRoute } from "./router";

describe("protected route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading state while the session is being resolved", () => {
    useAuthMock.mockReturnValue({ user: null, isLoading: true });

    expect(renderToStaticMarkup(<ProtectedRoute />)).toContain(
      'role="status"',
    );
  });

  it("redirects unauthenticated users to login", () => {
    useAuthMock.mockReturnValue({ user: null, isLoading: false });

    expect(renderToStaticMarkup(<ProtectedRoute />)).toContain(
      'data-route="navigate">/login',
    );
  });

  it("renders protected content for an authenticated user", () => {
    useAuthMock.mockReturnValue({
      user: { id: 7, name: "Teacher" },
      isLoading: false,
    });

    expect(renderToStaticMarkup(<ProtectedRoute />)).toContain(
      'data-route="outlet">protected content',
    );
  });
});
