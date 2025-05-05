import { v4 as uuidv4 } from "uuid";
import { IQuestion, Question, QuestionType, Tag } from "./types";
import { extractTextFromHTML } from "./utils";

export type MultipleChoiceQuestionData = {
  statement: string;
  options: Option[];
  answer: string;
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
    if (question.type !== "multiple_choice") {
      throw new Error("Invalid question type");
    }

    this.id = question.id;
    this.originalQuestionId = question.originalQuestionId;
    if (this.originalQuestionId === null) {
      this.originalQuestionId = question.id;
    }
    this.type = question.type;
    this.level = question.level;
    this.data = {
      statement: question.data.statement,
      options: Option.fromArray(question.data.options),
      answer: question.data.answer,
    };

    if (typeof(this.data.answer) === "number") {
      this.data.answer = this.data.options[this.data.answer].id;
    }

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

  static empty(emptyOptions: boolean = false): MultipleChoiceQuestion {
    return new MultipleChoiceQuestion({
      id: 0,
      originalQuestionId: null,
      type: "multiple_choice",
      level: null,
      data: {
        statement: "",
        options: emptyOptions ? [] : [new Option(""), new Option("")],
        answer: "",
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

  constructor(value: string, id?: string) {
    this.id = id || uuidv4();
    this.value = value;
  }

  static fromArray(options: string[] | { value: string; id: string }[]): Option[] {
    if (typeof options[0] === "string") {
      return Option.fromStringArray(options as string[]);
    }
    return Option.fromObjectArray(options as { value: string; id: string }[]);
  }

  static toObjectArray(options: Option[]): { value: string; id: string }[] {
    return options.map((option) => {
      return { value: option.value, id: option.id };
    });
  }

  static fromObjectArray(objects: { value: string; id: string }[]): Option[] {
    return objects.map((obj) => new Option(obj.value, obj.id));
  }

  static fromStringArray(options: string[]): Option[] {
    return options.map((option) => new Option(option));
  }
}
