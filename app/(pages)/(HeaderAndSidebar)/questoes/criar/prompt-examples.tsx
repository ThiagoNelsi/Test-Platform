import { Button } from "@/app/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/app/components/ui/dialog";
import HelpTooltip from "@/app/components/ui/help-tooltip";
import { Separator } from "@/app/components/ui/separator";
import { Lightbulb } from "lucide-react";

type Props = {
  setPrompt: (prompt: string) => void;
}

function PromptButton({ prompt, setPrompt, disabled = false }: { prompt: string; setPrompt: (prompt: string) => void, disabled?: boolean }) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full justify-start text-left h-auto py-2 px-3 whitespace-normal break-words mb-2"
      onClick={() => !disabled && setPrompt(prompt)}
      disabled={disabled}
    >
      <Lightbulb className="h-4 w-4 mr-2 flex-shrink-0" />
      <span className="text-xs overflow-ellipsis break-words whitespace-pre-wrap">{prompt}</span>
    </Button>
  )
}

function PromptList({ title, list, setPrompt, helpText, disabled }: {
  title: string;
  list: string[];
  setPrompt: (prompt: string) => void;
  helpText?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex-1 mb-4">
      <h3 className="flex items-center gap-2 my-2 font-bold text-sm">
        {title}
        <HelpTooltip
          text={helpText}
        />
      </h3>
      {list.map((prompt, index) => (
        <PromptButton
          key={index}
          prompt={prompt}
          setPrompt={setPrompt}
          disabled={disabled}
        />
      ))}
    </div>
  )
}

export default function PromptExamples({ setPrompt }: Props) {

  const basicPrompts = [
    "Crie questões baseadas no capítulo sobre Revolução Industrial do material selecionado, focando nos impactos sociais.",
    "Crie 5 questões sobre a Revolução Francesa.",
    "Gere 10 questões sobre a Revolução Industrial.",
    "Crie 5 questões variadas sobre progressões aritméticas e geométricas.",
  ]

  const alternativeSpecifications = [
    "Crie 4 questões sobre o período do Estado Novo no Brasil com 4 alternativas, com foco nas políticas econômicas e culturais.",
    "Gere 5 questões sobre a Revolução Industrial com 6 alternativas cada.",
  ]

  const styleSpecifications = [
    "Elabore questões curtas sobre a Guerra Fria, com ênfase na corrida armamentista.",
    "Gere questões sucintas sobre circuitos elétricos, com foco em resistores e capacitores.",
    "Crie questões contextualizadas sobre fotossíntese e respiração celular.",
    "Crie questões interpretativas com texto de contextualização sobre figuras de linguagem.",
  ]

  const questionWiseSpecifications = [
    `Crie 5 questões sobre progressões aritméticas (PAs) seguindo a estrutura:

* Questões 1 e 2 básicas, testando a capacidade de cálculo do aluno.

* Questões 3 e 4 testando a capacidade do aluno de aplicar PAs em situações do cotidiano.

* Questão 5 será a questão desafio, bem longa, exigindo aplicação de uma longa linha de raciocínio, pensamento crítico e múltiplos passos para resolução.`
  ]

  const badPromptExamples = [
    "Faz umas perguntas aí.",
    "Crie 10 questões sobre o capítulo 1 do livro.",
    "Crie questões de múltipla escolha sobre qualquer assunto.",
    "Crie questões de múltipla escolha.",
    "Gere questões sobre história.",
    "Crie questões de matemática.",
    "Crie questões de ciências.",
    "Cria 20 perguntas difíceis",
  ]

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="text-sm text-gray-500 hover:text-gray-700">
          Ver exemplos de prompt
        </button>
      </DialogTrigger>
      <DialogContent
        className="max-w-[95%] w-[800px] overflow-y-auto max-h-[90vh]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogTitle>
          Exemplos de prompt
        </DialogTitle>
        <div className="flex gap-5">
          <div className="flex-1">
            <h2 className="mb-2 text-green-500 font-bold">BOM</h2>
            <PromptList
              title="Prompt básico"
              helpText="Exemplos de prompts básicos para gerar questões."
              list={basicPrompts}
              setPrompt={setPrompt}
            />
            <PromptList
              title="Especificando questões"
              helpText="Você pode descrever como deseja cada questão individualmente."
              list={questionWiseSpecifications}
              setPrompt={setPrompt}
            />
            <PromptList
              title="Especificando alternativas"
              helpText="Você pode especificar o número de alternativas que deseja."
              list={alternativeSpecifications}
              setPrompt={setPrompt}
            />
            <PromptList
              title="Especificando estilos"
              helpText="Você pode especificar o estilo das questões que deseja. Questões podem ser curtas ou possuir um texto de contextualização, estilo ENEM."
              list={styleSpecifications}
              setPrompt={setPrompt}
            />
          </div>
          <Separator orientation="vertical" className="h-full" />
          <div className="flex-1">
            <h2 className="text-red-700 font-bold mb-2">RUIM</h2>
            <PromptList
              title="Exemplos ruins"
              helpText="Evite usar prompts vagos ou genéricos. Sempre especifique o assunto desejado e não o capítulo do material."
              list={badPromptExamples}
              setPrompt={setPrompt}
              disabled={true}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
