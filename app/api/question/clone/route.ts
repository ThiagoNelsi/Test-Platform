import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "../../auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { v4 } from "uuid";
import { QuestionFactory } from "@/lib/question";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json("Unauthorized", { status: 401 });
  }

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

  const parsed = QuestionFactory.from(questions.map(question => {
    const content = JSON.parse(question.content as string);

    return {
      authorId: session.user.id,
      type: "multiple_choice",
      level: question.level,
      source: question.source,
      subjects: question.subjects,
      data: {
        statement: content.statement || "",
        options: content.options,
        answer: content.answer,
      },
      id: -1,
      createdAt: new Date(),
      version: 0,
      tags: [],
      originalQuestionId: -1,
    }

  }));

  const cloned = await prisma.question.createMany({
    data: parsed.map(question => ({
      authorId: session.user.id,
      type: question.type,
      level: question.level,
      source: question.source,
      subjects: question.subjects,
      content: question.data,
    }))
  })

  return NextResponse.json(cloned);
}
