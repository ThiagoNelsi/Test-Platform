class SectionQuestion {
    public questionId: number;
    public version: number;

    constructor(questionId: number, version: number) {
        this.questionId = questionId;
        this.version = version;
    }
}

export class Section {
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