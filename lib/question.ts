import { MultipleChoiceQuestion } from "./multiple-choice-question";
import { Question } from "./types";

type PossibleQuestionTypes = MultipleChoiceQuestion;

export class QuestionFactory {
    static from(questions: Question[]): PossibleQuestionTypes[] {
        return questions.map(question => {
            switch (question.type) {
                case "multiple_choice":
                    return new MultipleChoiceQuestion(question);
                default:
                    throw new Error("Invalid question type");
            }
        });
    }
}