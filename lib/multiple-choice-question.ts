import { IQuestion, Question, QuestionType, Tag } from "./types";
import { extractTextFromHTML } from "./utils";

export type MultipleChoiceQuestionData = {
  statement: string;
  options: string[];
  answer: number;
};

export class MultipleChoiceQuestion implements IQuestion {
  public id: number;
  public type: QuestionType;
  public level: number | null;
  public data: MultipleChoiceQuestionData;
  public subjects: string[]
  public tags: Tag[];
  public authorId: number;
  public createdAt: Date;
  public version: number;

  constructor(question: Question) {
    this.id = question.id;
    this.type = question.type;
    this.level = question.level;
    this.data = question.data;
    this.subjects = question.subjects;
    this.tags = question.tags;
    this.authorId = question.authorId;
    this.createdAt = question.createdAt;
    this.version = question.version;
  }

  getText(): string {
    const optionsText = this.data.options
      .map((option) => {
        return extractTextFromHTML(option);
      })
      .join("\n");
    return extractTextFromHTML(this.data.statement) + "\n" + optionsText;
  }
}
