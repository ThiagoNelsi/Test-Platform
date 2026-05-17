import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { v4 } from "uuid";

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get("session")?.value;
  if (!sessionCookie) return NextResponse.json("Unauthorized", { status: 401 });

  const backend = process.env.BACKEND_URL ?? "";
  const meRes = await fetch(`${backend}/auth/me`, {
    headers: { cookie: `session=${sessionCookie}` },
    cache: "no-store",
  });
  if (!meRes.ok) return NextResponse.json("Unauthorized", { status: 401 });
  const me = await meRes.json();
  const userId = me?.user?.id;
  if (!userId) return NextResponse.json("Unauthorized", { status: 401 });

  const { questionIds } = await request.json();

  if (!questionIds) {
    return NextResponse.json("Bad Request", { status: 400 });
  }

  const questions = await prisma.repositoryQuestion.findMany({
    where: {
      id: {
        in: questionIds,
      },
    }
  });

  if (questions.length === 0) {
    return NextResponse.json("Not Found", { status: 404 });
  }

  const parsed = questions.map((question) => {
    const content = JSON.parse(question.content as string);
    return {
      authorId: userId,
      type: "multiple_choice",
      level: question.level,
      source: question.source,
      subjects: question.subjects,
      content,
    };
  });

  const cloned = await prisma.question.createMany({
    data: parsed.map((q) => ({
      authorId: q.authorId,
      type: q.type,
      level: q.level,
      source: q.source,
      subjects: q.subjects,
      content: q.content as any,
    })),
  });

  return NextResponse.json(cloned);
}
