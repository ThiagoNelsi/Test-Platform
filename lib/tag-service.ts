"use server";

import { Tag } from "@/lib/types";
import { backendJson } from "./backend-api";

export const createTag = async (tag: Pick<Tag, "name" | "color">) => {
  const { ok, data } = await backendJson<{ error?: string; tag?: Tag }>(
    "/api/tags",
    {
      method: "POST",
      body: tag,
    },
  );

  if (!ok || !data) {
    return {
      error: data?.error || "Erro ao criar tag",
    };
  }

  if (data.error) {
    return {
      error: data.error,
    };
  }

  return {
    success: true,
    tag: data.tag,
  };
};

export const getTags = async () => {
  const { ok, data } = await backendJson<{ tags?: Tag[] }>("/api/tags");
  if (!ok || !data?.tags) return [];

  return data.tags;
};

export const getQuestionsPerTag = async () => {
  const { ok, data } = await backendJson<{
    questionsPerTag?: { tagId: number; questions: number[] }[];
  }>("/api/tags/questions-per-tag");

  if (!ok || !data?.questionsPerTag) {
    return [];
  }

  return data.questionsPerTag;
};
