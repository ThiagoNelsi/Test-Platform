import { SubmissionSection } from "./section";

type TestData = {
    id: number;
    name: string;
    description: string;
    value: number;
    dueDate: Date | null;
    timer: number | null;
    classroom: string;
};

type SubmissionData = {
    id: number;
    sections: SubmissionSection[];
    startTime: Date;
    finishTime: Date | null;
    score: number | null;
    answers: Record<number, any>;
};

export class Submission {
    public test: TestData;
    public submission: SubmissionData;

    constructor(test: TestData, submission: SubmissionData) {
        this.test = test;
        this.submission = submission;
    }

    static fromJSON(json: any) {
        const test: TestData = {
            id: json.test.id,
            name: json.test.name,
            description: json.test.description,
            value: json.test.value,
            dueDate: json.test.dueDate,
            timer: json.test.timer,
            classroom: json.test.classroom,
        };

        const submission: SubmissionData = {
            id: json.submission.id,
            sections: json.submission.sections.map((section: any) => {
                return SubmissionSection.fromJSON(section);
            }),
            startTime: new Date(json.submission.startTime),
            finishTime: json.submission.finishTime ? new Date(json.submission.finishTime) : null,
            score: json.submission.score,
            answers: json.submission.answers,
        };

        return new Submission(test, submission);
    }
}