"use client";

import { useEffect, useState, useCallback } from "react";

type User = { id: number; name?: string | null; email?: string | null; image?: string | null } | null;

export function useAuth() {
  const [user, setUser] = useState<User>(null);

  useEffect(() => {
    let mounted = true;
    const backend = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

    fetch(`${backend}/auth/me`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (!mounted) return;
        setUser(data?.user ?? null);
      })
      .catch(() => {
        if (!mounted) return;
        setUser(null);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const signIn = useCallback(() => {
    const backend = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";
    window.location.href = `${backend.replace(/\/+$/g, "")}/auth/google/start`;
  }, []);

  const signOut = useCallback(async () => {
    const backend = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";
    try {
      await fetch(`${backend.replace(/\/+$/g, "")}/auth/logout`, { method: "POST", credentials: "include" });
    } catch (e) {
      // ignore
    }
    window.location.href = "/login";
  }, []);

  return { user, signIn, signOut } as const;
}
