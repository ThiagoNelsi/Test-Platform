import { MultipleChoiceQuestion } from "./multiple-choice-question";
import { Question, QuestionType } from "./types";

export type PossibleQuestionTypes = MultipleChoiceQuestion;

export class QuestionFactory {
  static empty(type: QuestionType = "multiple_choice"): PossibleQuestionTypes {
    switch (type) {
      case "multiple_choice":
        return MultipleChoiceQuestion.empty();
      default:
        throw new Error("Invalid question type");
    }
  }

  static from(questions: Question[]): PossibleQuestionTypes[] {
    return questions.map((question) => {
      switch (question.type) {
        case "multiple_choice":
          return new MultipleChoiceQuestion(question);
        default:
          throw new Error("Invalid question type");
      }
    });
  }
}
