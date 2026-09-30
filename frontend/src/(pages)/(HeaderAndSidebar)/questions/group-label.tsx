import { PossibleQuestionTypes } from "@/lib/question";

type Props = {
  groupBy: keyof PossibleQuestionTypes | null;
  section: string;
};

export default function GroupLabel({ groupBy, section }: Props) {
  const getLevel = () => {
    switch (section) {
      case "-1":
        return "Sem nível";
      case "0":
        return "Fácil";
      case "1":
        return "Médio";
      case "2":
        return "Difícil";
      default:
        return section;
    }
  }

  const getSource = () => {
    switch (section) {
      case "AI":
        return "Questões geradas por IA";
      case "MANUAL":
        return "Criadas por você";
      default:
        return section;
    }
  }

  const getSubjects = () => {
    switch (section) {
      default:
        return section;
    }
  }

  const getLabel = () => {
    switch (groupBy) {
      case "level":
        return getLevel();
      case "source":
        return getSource();
      case "subjects":
        return getSubjects();
      default:
        return section;
    }
  }

  return <span>{getLabel()}</span>;
}
