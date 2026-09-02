import { MultipleChoiceQuestionContent } from "@/lib/multiple-choice-question";

export const valitadeMultipleChoice = (data: MultipleChoiceQuestionContent) => {
  const errors = [];

  if (!data) {
    errors.push("Dados da questão são obrigatórios");
  }

  if (!data.statement || data.statement.trim() === "") {
    errors.push("Enunciado é obrigatório");
  }

  if (!data.options) {
    errors.push("Opções são obrigatórias");
  }

  const options = data.options.filter((option) => option.value.trim() !== "");

  if (options.length < 2) {
    errors.push("A questão deve conter no mínimo 2 opções");
  }

  const correctOptions = options.filter(option => option.id === data.answer);

  if (correctOptions.length === 0) {
    errors.push("A questão deve ter pelo menos uma opção correta");
  }

  if (errors.length > 0) return { errors };

  return {
    statement: data.statement,
    options,
    answer: data.answer,
  };
};
