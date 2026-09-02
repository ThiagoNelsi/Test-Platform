import type {
  CloneRepositoryQuestionsResponse,
  RepositoryQuestionDto,
  RepositoryQuestionsResponse,
} from "api-contracts";
import { backendJson } from "./backend-api";
import { QuestionFactory } from "./question";
import type { Question, QuestionType } from "./types";

const parseQuestionContent = (value: unknown) => {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

function getTagId(name: string): number {
  let hash = 0;
  for (const character of name) {
    hash = (hash * 31 + character.charCodeAt(0)) | 0;
  }
  return Math.abs(hash) || 1;
}

function toQuestion(question: RepositoryQuestionDto): Question {
  return {
    id: question.id,
    originalQuestionId: null,
    type: question.type as QuestionType,
    content: parseQuestionContent(question.content),
    subjects: question.subjects,
    tags: question.tags.map((name) => ({
      id: getTagId(name),
      name,
      color: 0,
      userId: 0,
    })),
    createdAt: new Date(question.createdAt),
    authorId: null,
    level: question.level,
    version: 1,
    source: question.source,
  };
}

export async function getRepositoryQuestions() {
  const data = await backendJson<RepositoryQuestionsResponse>("/api/repository");
  return QuestionFactory.from(data.questions.map(toQuestion));
}

export async function cloneRepositoryQuestions(questionIds: number[]) {
  return backendJson<CloneRepositoryQuestionsResponse>("/api/repository/clone", {
    method: "POST",
    body: { questionIds },
  });
}
