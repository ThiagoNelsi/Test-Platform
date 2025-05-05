import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { authOptions } from "../auth/[...nextauth]/route";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user || !session.user.id) {
    return Response.json({ error: "Unauthorized" });
  }

  const {
    type,
    level,
    content,
    subjects,
    tags,
    source,
  } = await request.json();

  try {
    const question = await prisma?.repositoryQuestion.create({
      data: {
        type,
        level,
        content,
        subjects,
        source,
        tags,
      }
    });

    return Response.json({
      question
    });
  } catch (error) {
    console.error("Error creating repository question:", error);
    return Response.json({ error: "Failed to create repository question" }, { status: 500 });
  }

}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  try {
    if (id) {
      const question = await prisma?.repositoryQuestion.findUnique({
        where: { id: Number(id) },
      });
      if (!question) {
        return Response.json({ error: "Question not found" }, { status: 404 });
      }
      return Response.json({ question });
    } else {
      const questions = await prisma?.repositoryQuestion.findMany();
      return Response.json({ questions });
    }
  } catch (error) {
    console.error("Error fetching repository question(s):", error);
    return Response.json({ error: "Failed to fetch repository question(s)" }, { status: 500 });
  }
}
