
import type { AuthMeResponse, LogoutResponse } from "api-contracts";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  backendJson,
  getBackendBaseUrl,
  setUnauthorizedHandler,
} from "@/lib/backend-api";
import { queryKeys } from "@/lib/query-keys";

export type AuthUser = AuthMeResponse["user"];

export type AuthContextValue = {
  user: AuthUser;
  isLoading: boolean;
  refresh: () => Promise<AuthUser>;
  signIn: () => void;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

async function fetchCurrentUser(): Promise<AuthUser> {
  try {
    const response = await backendJson<AuthMeResponse>("/auth/me", {
      // An absent session is the expected result during initial resolution.
      handleUnauthorized: false,
    });

    return response.user;
  } catch {
    return null;
  }
}

function redirectToLogin() {
  if (typeof window === "undefined" || window.location.pathname === "/login") {
    return;
  }

  window.location.replace("/login");
}

export default function SessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const authQuery = useQuery({
    queryKey: queryKeys.auth,
    queryFn: fetchCurrentUser,
    staleTime: 30_000,
    retry: false,
  });
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await backendJson<LogoutResponse>("/auth/logout", {
        method: "POST",
        handleUnauthorized: false,
      });
    },
  });
  const logout = logoutMutation.mutateAsync;
  const user = authQuery.data ?? null;
  const isLoading = authQuery.isPending;

  const refresh = useCallback(async (): Promise<AuthUser> => {
    return queryClient.fetchQuery({
      queryKey: queryKeys.auth,
      queryFn: fetchCurrentUser,
      staleTime: 0,
      retry: false,
    });
  }, [queryClient]);

  const handleUnauthorized = useCallback(() => {
    queryClient.setQueryData(queryKeys.auth, null);
    void queryClient.cancelQueries({ queryKey: queryKeys.auth });
    redirectToLogin();
  }, [queryClient]);

  useEffect(() => {
    return setUnauthorizedHandler(handleUnauthorized);
  }, [handleUnauthorized]);

  const signIn = useCallback(() => {
    window.location.assign(`${getBackendBaseUrl()}/auth/google/start`);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logout();
    } catch {
      // The local session must still be cleared if the logout request fails.
    }

    queryClient.setQueryData(queryKeys.auth, null);
    redirectToLogin();
  }, [logout, queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, refresh, signIn, signOut }),
    [isLoading, refresh, signIn, signOut, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useSession() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }

  return context;
}
