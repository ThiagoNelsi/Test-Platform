"use server";

import { cookies } from "next/headers";

export async function getUserId(): Promise<number | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;

  if (!sessionCookie) return null;

  const backend = process.env.BACKEND_URL ?? "";

  try {
    const res = await fetch(`${backend}/auth/me`, {
      headers: { cookie: `session=${sessionCookie}` },
      cache: "no-store",
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data?.user?.id ?? null;
  } catch (e) {
    console.error("getUserId fetch error", e);
    return null;
  }
}
