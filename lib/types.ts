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
}

export interface IQuestion extends Question {
    getText(): string;
}
