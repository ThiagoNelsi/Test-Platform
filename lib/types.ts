import { Section } from "@/app/context/create-test-context";

export type QuestionType = "multiple_choice" | "true_or_false";

export type TagColor = {
    background: string;
    text: string;
    border: string;
}

export type Tag = {
    id: number;
    userId: number;
    name: string;
    color: number;
}

export type Question = {
    type: QuestionType;
    data: any;
    tags: Tag[];
    id: number;
    createdAt: Date;
    authorId: number;
    level: number | null;
    version: number;
}

export interface IQuestion extends Question {
    getText(): string;
}

export type TestData = {
    name: string;
    value: number;
    description: string;
    dueDate: Date | undefined;
    duration: number;
    publishDate: Date | undefined;
    sections: Section[];
    classroomId: number;
    status: "draft" | "published" | "scheduled";
}