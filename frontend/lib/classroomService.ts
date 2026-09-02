import type {
  ClassroomsResponse,
  ClassroomDto,
  CreateClassroomResponse,
  JoinClassroomResponse,
} from "api-contracts";
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

function hydrateClassroom(classroom: ClassroomDto): Classroom {
  return {
    ...classroom,
    createdAt: new Date(classroom.createdAt),
  };
}

export async function getClassrooms() {
  const data = await backendJson<ClassroomsResponse>("/api/classrooms");

  return {
    ownedClasses: data.ownedClasses.map((classroom) => ({
      ...hydrateClassroom(classroom),
      owner: classroom.owner,
    })),
    classrooms: data.classrooms.map((classroom) => ({
      ...hydrateClassroom(classroom),
      owner: classroom.owner,
    })),
  };
}

export async function createClassroom(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const data = await backendJson<CreateClassroomResponse>("/api/classrooms", {
    method: "POST",
    body: { name },
  });

  return hydrateClassroom(data.classroom);
}

export async function joinClassroom(formData: FormData) {
  const code = String(formData.get("code") || "").toUpperCase().trim();

  return backendJson<JoinClassroomResponse>("/api/classrooms/join", {
    method: "POST",
    body: { code },
  });
}
