import { IQuestion } from "./types";

export interface ISection<T> {
    shuffle?: boolean;
    count?: number;
    questions: T[];
}

type SubmissionSectionQuestion = Pick<IQuestion, 'id' | 'originalQuestionId' | 'type' | 'version'> & {
    content: {
        statement: string;
        options: string[];
    };
}

class SectionQuestion {
    public questionId: number;
    public version: number;

    constructor(questionId: number, version: number) {
        this.questionId = questionId;
        this.version = version;
    }
}

export class Section implements ISection<SectionQuestion> {
    public shuffle?: boolean;
    public count?: number;
    public questions: SectionQuestion[];

    constructor(questions: SectionQuestion[], shuffle?: boolean, count?: number) {
        this.shuffle = shuffle;
        this.questions = questions;
        this.count = count;
    }

    static fromJSON(json: any): Section {
        const questions = json.questions.map((q: any) => {
            return new SectionQuestion(q.questionId, q.version);
        });
        return new Section(questions, json.shuffle, json.count);
    }
}

export class SubmissionSection implements ISection<SubmissionSectionQuestion> {
    public shuffle?: boolean;
    public count?: number;
    public questions: SubmissionSectionQuestion[];

    constructor(questions: SubmissionSectionQuestion[], shuffle?: boolean, count?: number) {
        this.shuffle = shuffle;
        this.questions = questions;
        this.count = count;
    }

    static fromJSON(json: any) {
        const questions = json.questions.map((q: any) => {
            return {
                id: q.id,
                originalQuestionId: q.originalQuestionId ?? q.id,
                type: q.type,
                version: q.version,
                content: {
                    statement: q.content.statement,
                    options: q.content.options,
                },
            };
        });
        return new SubmissionSection(questions, json.shuffle, json.count);
    }
}