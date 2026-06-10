"use server";

import { revalidatePath } from "next/cache";
import { backendJson } from "./backend-api";

export type Classroom = {
  id: number;
  name: string;
  code: string;
  ownerId: number;
  createdAt: Date;
};

type Owner = {
  id: number;
  name: string;
  email: string;
};

export type ClassroomWithOwner = { owner: Owner } & Classroom;

type ClassroomsResponse = {
  ownedClasses?: ClassroomWithOwner[];
  classrooms?: ClassroomWithOwner[];
};

function hydrateClassroom(classroom: ClassroomWithOwner): ClassroomWithOwner {
  return {
    ...classroom,
    createdAt: new Date(classroom.createdAt),
  };
}

export async function getClassrooms() {
  const { ok, data } = await backendJson<ClassroomsResponse>("/api/classrooms");

  if (!ok || !data) return null;

  return {
    ownedClasses: (data.ownedClasses || []).map(hydrateClassroom),
    classrooms: (data.classrooms || []).map(hydrateClassroom),
  };
}

export async function createClassroom(formData: FormData) {
  const name = String(formData.get("name") || "").trim();

  const { ok, data } = await backendJson<{
    error?: string;
    classroom?: Classroom;
  }>("/api/classrooms", {
    method: "POST",
    body: { name },
  });

  if (!ok || !data) {
    return { error: data?.error || "Erro ao criar turma" };
  }

  if (data.error) {
    return { error: data.error };
  }

  if (!data.classroom) {
    return null;
  }

  revalidatePath("/home");

  return {
    ...data.classroom,
    createdAt: new Date(data.classroom.createdAt),
  };
}

export async function joinClassroom(formData: FormData) {
  const code = String(formData.get("code") || "").toUpperCase().trim();

  const { ok, data } = await backendJson<{ error?: string }>(
    "/api/classrooms/join",
    {
      method: "POST",
      body: { code },
    },
  );

  if (!ok) {
    return { error: data?.error || "Erro ao entrar na turma" };
  }

  revalidatePath("/home");
  return { ok: true };
}
