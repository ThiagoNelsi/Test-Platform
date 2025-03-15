"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function getUserId(): Promise<number | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    console.error("User not found in session");
    return null;
  }

  return session.user.id;
}
