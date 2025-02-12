import { Question } from "@/prisma/generated/postgres";
import { QuestionData as MongoQuestion } from "@/prisma/generated/mongodb";

export type QuestionType = "multiple_choice" | "true_or_false";

export type CompleteQuestion = Question & MongoQuestion;

export type MultipleChoiceQuestion = {
    statement: string;
    options: {
        value: string;
        isCorrect: boolean;
    }[];
}