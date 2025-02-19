import { IQuestion, Question, QuestionType, Tag } from "./types";
import { extractTextFromHTML } from "./utils";

export type MultipleChoiceQuestionOption = {
    value: string;
    isCorrect: boolean;
}

export type MultipleChoiceQuestionData = {
    statement: string;
    options: MultipleChoiceQuestionOption[];
}

export class MultipleChoiceQuestion implements IQuestion {
    public id: number;
    public type: QuestionType;
    public level: number | null;
    public data: MultipleChoiceQuestionData;
    public tags: Tag[]
    public authorId: number;
    public createdAt: Date;

    constructor(question: Question) {
        this.id = question.id;
        this.type = question.type;
        this.level = question.level;
        this.data = question.data;
        this.tags = question.tags;
        this.authorId = question.authorId;
        this.createdAt = question.createdAt;
    }

    getText(): string {
        const optionsText = this.data.options.map((option) => {
            return extractTextFromHTML(option.value);
        }).join("\n");
        return extractTextFromHTML(this.data.statement) + "\n" + optionsText;
    }
}