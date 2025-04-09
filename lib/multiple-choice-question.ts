import { IQuestion, Question, QuestionType, Tag } from "./types";
import { extractTextFromHTML } from "./utils";

export type MultipleChoiceQuestionData = {
  statement: string;
  options: Option[];
  answer: number;
};

export class MultipleChoiceQuestion implements IQuestion {
  public id: number;
  public originalQuestionId: number | null;
  public type: QuestionType;
  public level: number | null;
  public data: MultipleChoiceQuestionData;
  public subjects: string[]
  public tags: Tag[];
  public authorId: number | null;
  public createdAt: Date | null;
  public version: number;
  public source: string | null;

  constructor(question: Question) {
    this.id = question.id;
    this.originalQuestionId = question.originalQuestionId;
    if (this.originalQuestionId === null) {
      this.originalQuestionId = question.id;
    }
    this.type = question.type;
    this.level = question.level;
    this.data = {
      statement: question.data.statement,
      options: Option.fromArray(question.data.options, question.data.answer),
      answer: question.data.answer,
    };
    this.subjects = question.subjects;
    this.tags = question.tags;
    this.authorId = question.authorId;
    this.createdAt = question.createdAt;
    this.version = question.version;
    this.source = question.source || null;
  }

  getText(): string {
    const optionsText = this.data.options
      .map((option) => {
        return extractTextFromHTML(option.value);
      })
      .join("\n");
    return extractTextFromHTML(this.data.statement) + "\n" + optionsText;
  }

  static empty(): MultipleChoiceQuestion {
    return new MultipleChoiceQuestion({
      id: 0,
      originalQuestionId: null,
      type: "multiple_choice",
      level: null,
      data: {
        statement: "",
        options: [],
        answer: -1,
      },
      subjects: [],
      tags: [],
      authorId: null,
      createdAt: null,
      version: 1,
      source: null,
    });
  }
}

export class Option {
  id: string;
  value: string;
  isCorrect: boolean;

  constructor(value: string, isCorrect: boolean) {
    this.id = Math.random().toString();
    this.value = value;
    this.isCorrect = isCorrect;
  }

  static fromArray(options: string[], answer: number) {
    return options.map((option, index) => {
      return new Option(option, index === answer);
    });
  }
}