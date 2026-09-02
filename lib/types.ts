import { Section } from "@/src/context/create-test-context";

export type QuestionType = "multiple_choice" | "true_or_false";

export type TagColor = {
  background: string;
  text: string;
  border: string;
};

export type Tag = {
  id: number;
  userId: number;
  name: string;
  color: number;
};

export type Question = {
  id: number;
  originalQuestionId: number | null;
  type: QuestionType;
  content: any;
  subjects: string[];
  tags: Tag[];
  createdAt: Date | null;
  authorId: number | null;
  level: number | null;
  version: number;
  source?: string | null;
};

export interface IQuestion extends Question {
  getText(): string;
}

export type TestData = {
  id?: number;
  name: string;
  value: number;
  description: string;
  dueDate: Date | undefined;
  duration: number;
  publishDate: Date | undefined;
  sections: Section[];
  classroomIds: number[];
  status: "draft" | "published" | "scheduled";
};

export type ResourceStatus = "UPLOADED" | "PROCESSING" | "PROCESSED" | "FAILED";

export type Resource = {
  id: number;
  createdAt: Date;
  deletedAt: Date | null;
  processedAt: Date | null;
  ownerId: number;
  status: ResourceStatus;
  filename: string;
  fileType: string;
  tags: string[];
  objectKey: string;
  jobId: string | null;
}
