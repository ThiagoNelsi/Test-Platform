import { Question } from "@/lib/types";
import MultipleChoiceRenderer from "./question-types/multiple-choice/renderer";

export default function QuestionRenderer({ question }: { question: Question }) {
    console.log(question)
    const { type  } = question;

    switch (type) {
        case 'multiple_choice':
            return <MultipleChoiceRenderer content={question.data}  />;
        default:
            return null;
    }
}