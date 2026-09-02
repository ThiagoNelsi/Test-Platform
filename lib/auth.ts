import type { AuthMeResponse } from "api-contracts";
import { backendJson } from "./backend-api";

export async function getUserId(): Promise<number | null> {
  try {
    const data = await backendJson<AuthMeResponse>("/auth/me", {
      handleUnauthorized: false,
    });

    return data.user?.id ?? null;
  } catch {
    return null;
  }
}
