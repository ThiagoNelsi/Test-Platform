import type {
  CreateTagRequest,
  CreateTagResponse,
  QuestionsPerTagResponse,
  TagsResponse,
} from "api-contracts";
import { Tag } from "@/lib/types";
import { backendJson } from "./backend-api";

export const createTag = async (tag: Pick<Tag, "name" | "color">) => {
  const body: CreateTagRequest = tag;
  return backendJson<CreateTagResponse>("/api/tags", {
    method: "POST",
    body,
  });
};

export const getTags = async (): Promise<Tag[]> => {
  const data = await backendJson<TagsResponse>("/api/tags");
  return data.tags;
};

export const getQuestionsPerTag = async () => {
  const data = await backendJson<QuestionsPerTagResponse>(
    "/api/tags/questions-per-tag",
  );

  return data.questionsPerTag;
};
