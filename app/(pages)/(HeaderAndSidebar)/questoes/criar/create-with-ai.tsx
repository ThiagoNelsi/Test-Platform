import { useEffect, useRef, useState } from "react"
import GeneratedQuestions from "./generated-questions"
import { TabsContent } from "@/app/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Label } from "@/app/components/ui/label";
import { Button } from "@/app/components/ui/button";
import { CircleHelp, FileText, ImageIcon, Lightbulb, Loader2, Sparkles, X } from "lucide-react";
import { Textarea } from "@/app/components/ui/textarea";
import MaterialSelectorDialog from "./material-selector";
import { socket } from "@/app/socket";
import { Tooltip, TooltipTrigger } from "@/app/components/ui/tooltip";
import { TooltipContent } from "@radix-ui/react-tooltip";
import HelpTooltip from "@/app/components/ui/help-tooltip";
import PromptExamples from "./prompt-examples";

export interface Material {
  id: number
  filename: string
  fileType: string
  tags: string[]
  objectKey: string
  status: string
  createdAt: string
}

export type StreamedQuestion = {
  statement?: string
  options?: string[]
  answer?: string
  topic?: string
}

type CreateWithAIProps = {
  preSelectedResource?: string
}

export default function CreateWithAI({ preSelectedResource }: CreateWithAIProps) {
  const [materials, setMaterials] = useState<Material[] | null>(null)
  const [selectedMaterials, setSelectedMaterials] = useState<number[]>([
    ...(preSelectedResource ? [parseInt(preSelectedResource)] : []),
  ])
  const [showMaterialSelector, setShowMaterialSelector] = useState(preSelectedResource === undefined ? true : false);
  const [aiPrompt, setAiPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isReasoning, setIsReasoning] = useState(false)
  const [streamedQuestions, setStreamedQuestions] = useState<StreamedQuestion[]>([])
  const [model, setModel] = useState("o4-mini")
  const [modelOptions, setModelOptions] = useState<string[]>(["o4-mini", "o3-mini", "gpt-4o-mini", "gpt-3.5-turbo"])

  // socket
  const [isConnected, setIsConnected] = useState(false);
  const [transport, setTransport] = useState("N/A");

  useEffect(() => {
    fetchMaterials();

    if (socket.connected) {
      onConnect();
    }

    function onConnect() {
      setIsConnected(true);
      setTransport(socket.io.engine.transport.name);

      socket.io.engine.on("upgrade", (transport) => {
        setTransport(transport.name);
      });
    }

    function onDisconnect() {
      setIsConnected(false);
      setTransport("N/A");
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [])

  const fetchMaterials = async () => {
    const res = await fetch("/api/resource?status=PROCESSED")
    const data = await res.json()
    if (res.ok) {
      setMaterials(data.resources)
    } else {
      console.error("Erro ao buscar materiais:", data.error)
    }
  }

  const toggleMaterialSelection = (id: number) => {
    setSelectedMaterials((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]))
  }

  const getMaterialIcon = (type: string) => {
    type = type.split("/")[1]
    switch (type) {
      case "pdf":
        return <FileText className="h-5 w-5 text-red-500" />
      case "docx":
        return <FileText className="h-5 w-5 text-blue-500" />
      case "pptx":
        return <FileText className="h-5 w-5 text-orange-500" />
      case "image":
        return <ImageIcon className="h-5 w-5 text-green-500" />
      default:
        return <FileText className="h-5 w-5 text-gray-500" />
    }
  }

  const generateQuestions = async () => {
    setIsGenerating(true)

    socket.emit("prompt", {
      prompt: aiPrompt,
      model,
      documents: selectedMaterials.map(id => materials?.find(m => m.id === id)?.objectKey),
    })
  }

  // Estado para armazenar o texto parcial recebido e o buffer de parsing
  const [partialText, setPartialText] = useState("");
  const parsingState = useRef({
    currentTag: null as null | string,
    currentContent: "",
    currentQuestion: {} as any,
    questions: [] as any[],
    options: [] as string[],
  });

  // Função de parsing incremental
  function parseChunkedQuestions(chunk: string) {
    const state = parsingState.current;
    let text = state.currentContent + chunk;
    const tagRegex = /\[(QUESTION|STATEMENT|OPTION|ANSWER|TOPIC)\]/g;
    let match;
    let lastIndex = 0;

    while ((match = tagRegex.exec(text)) !== null) {
      const tag = match[1];
      const tagStart = match.index;
      if (state.currentTag) {
        // Salva o conteúdo da tag anterior (apenas o trecho novo)
        const content = text.substring(lastIndex, tagStart);
        switch (state.currentTag) {
          case "STATEMENT":
            state.currentQuestion.statement = content;
            break;
          case "OPTION":
            const trimmedOption = content.trim();
            if (trimmedOption && state.options[state.options.length - 1] !== trimmedOption) {
              state.options.push(trimmedOption);
            }
            break;
          case "ANSWER":
            state.currentQuestion.answer = content.trim();
            break;
          case "TOPIC":
            state.currentQuestion.topic = content.trim();
            break;
        }
      }
      // Quando encontrar [QUESTION], inicia nova questão
      if (tag === "QUESTION") {
        if (Object.keys(state.currentQuestion).length > 0) {
          state.currentQuestion.options = state.options.slice();
          state.questions.push(state.currentQuestion);
        }
        state.currentQuestion = {};
        state.options = [];
      }
      state.currentTag = tag;
      lastIndex = tagRegex.lastIndex;
    }
    // Acumula o conteúdo restante
    state.currentContent = text.substring(lastIndex);

    // Atualiza o statement ou topic em tempo real se a tag atual for adequada
    if (state.currentTag === "STATEMENT") {
      state.currentQuestion.statement = state.currentContent;
    } else if (state.currentTag === "TOPIC") {
      state.currentQuestion.topic = state.currentContent.trim();
    }

    // Se terminar com [TOPIC], fecha a questão
    if (state.currentTag === "TOPIC") {
      // Se recebeu conteúdo de tópico e esse é o último chunk ou o padrão terminal foi encontrado
      if (state.currentContent.trim() || chunk.endsWith("\n")) {
        // Atribuir o tópico à questão atual
        state.currentQuestion.topic = state.currentContent.trim();

        // Verificar se é o final de uma questão
        if (/\[TOPIC\][^\[]*$/g.test(text) || chunk.endsWith("\n")) {
          state.currentQuestion.options = state.options.slice();
          state.questions.push(state.currentQuestion);
          state.currentQuestion = {};
          state.options = [];
          state.currentTag = null;
          state.currentContent = "";
        }
      }
    } else if (state.currentTag && state.currentContent && chunk.endsWith("\n")) {
      // Se não há mais tags, mas há conteúdo, salva o conteúdo da última tag
      const content = state.currentContent.trim();
      switch (state.currentTag) {
        case "STATEMENT":
          state.currentQuestion.statement = content;
          break;
        case "OPTION":
          const trimmedOptionRest = content.trim();
          if (trimmedOptionRest && state.options[state.options.length - 1] !== trimmedOptionRest) {
            state.options.push(trimmedOptionRest);
          }
          break;
        case "ANSWER":
          state.currentQuestion.answer = content;
          break;
        case "TOPIC":
          state.currentQuestion.topic = content;

          // Apenas finaliza a questão se houver um padrão claro de término
          if (chunk.endsWith("\n\n") || chunk.endsWith("\n[")) {
            state.currentQuestion.options = state.options.slice();
            state.questions.push(state.currentQuestion);
            state.currentQuestion = {};
            state.options = [];
            state.currentTag = null;
            state.currentContent = "";
          }
          break;
      }
    }

    // Atualiza o estado de questões geradas, incluindo a questão parcial
    const questionsToShow = [...state.questions];
    if (Object.keys(state.currentQuestion).length > 0 || state.options.length > 0 || state.currentContent.trim()) {
      // Monta uma cópia da questão parcial
      const partial = { ...state.currentQuestion, options: state.options.slice() };
      questionsToShow.push(partial);
    }
    setStreamedQuestions(questionsToShow);
  }

  function shuffleOptions() {
    setStreamedQuestions((prev) =>
      prev.map((question) => {
        if (question.options) {
          const correctOption = question.options[Number(question.answer)];
          console.log("CORRECT OPTION:", correctOption); // <-- Log da opção correta
          // Embaralha as opções, garantindo que a opção correta seja mantida
          console.log("OPTIONS BEFORE SHUFFLE:", question.options); // <-- Log das opções antes do embaralhamento
          const shuffledOptions = [...question.options].sort(() => Math.random() - 0.5);
          console.log("SHUFFLED OPTIONS:", shuffledOptions); // <-- Log das opções embaralhadas
          return { ...question, options: shuffledOptions, answer: shuffledOptions.indexOf(correctOption).toString() };
        }
        return question;
      })
    );
  }

  // useEffect para escutar os chunks do socket
  useEffect(() => {
    function onChunk(chunk: string) {
      setPartialText((prev) => prev + chunk);
      parseChunkedQuestions(chunk);
    }

    function onReasoningStarted() {
      setIsReasoning(true);
    }

    function onReasoningFinished() {
      setIsReasoning(false);
    }

    function onGenerationFinished() {
      console.log("TERMINOU")
      setIsGenerating(false);
      shuffleOptions();
    }

    socket.on("chunk", onChunk);
    socket.on("reasoning-started", onReasoningStarted);
    socket.on("reasoning-finished", onReasoningFinished);
    socket.on("generation-finished", onGenerationFinished);
    return () => {
      socket.off("chunk", onChunk);
      socket.off("reasoning-started", onReasoningStarted);
      socket.off("reasoning-finished", onReasoningFinished);
      socket.off("generation-finished", onGenerationFinished);
    };
  }, []);

  // Limpa o estado ao gerar novas questões
  useEffect(() => {
    if (isGenerating) {
      setPartialText("");
      parsingState.current = {
        currentTag: null,
        currentContent: "",
        currentQuestion: {},
        questions: [],
        options: [],
      };
      setStreamedQuestions([]);
    }
  }, [isGenerating]);

  return (
    <TabsContent value="ai">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel de configuração da IA */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle>Configurar Geração</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Materiais de referência */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Materiais de referência (opcional)</Label>
                <HelpTooltip
                  link="#"
                  text="Os materiais são usados para gerar questões com mais afinidade com o conteúdo ensinado. Recomenda-se selecionar materiais relacionados ao tema para aumentar a qualidade das questões geradas."
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => setShowMaterialSelector(true)}
                >
                  <FileText className="h-4 w-4" />
                  <span>
                    {selectedMaterials.length
                      ? `${selectedMaterials.length} material(is) selecionado(s)`
                      : "Selecionar materiais"}
                  </span>
                </Button>
              </div>

              {selectedMaterials.length > 0 && (
                <div className="mt-3 space-y-2">
                  {selectedMaterials.map((id) => {
                    const material = materials?.find((m) => m.id === id)
                    if (!material) return null

                    return (
                      <div
                        key={id}
                        className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-md"
                      >
                        {getMaterialIcon(material.fileType)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" title={material.filename}>
                            {material.filename}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => toggleMaterialSelection(id)}
                        >
                          <X className="h-4 w-4" />
                          <span className="sr-only">Remover</span>
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-4">
              <Label>Modelo</Label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="border rounded-md p-2"
              >
                {modelOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            {/* Prompt para a IA */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Prompt para a IA</Label>
                <HelpTooltip link="#">
                  <p>
                    O prompt é a descrição das questões que você deseja. Quanto mais detalhado, melhor o resultado.
                  </p>
                  <p>Clique em <strong>Ver exemplos de prompt</strong> para ver exemplos de prompts bons e ruins.</p>
                </HelpTooltip>
              </div>
              {/* Exemplos de prompts */}
              <PromptExamples setPrompt={setAiPrompt} />
              <Textarea
                id="ai-prompt"
                placeholder="Descreva as questões que deseja gerar..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="min-h-[150px]"
              />
              <p className="text-xs text-muted-foreground">
                {selectedMaterials.length > 0
                  ? "Descreva o que você deseja extrair dos materiais selecionados."
                  : "Sem materiais selecionados, a IA irá gerar questões apenas com base no seu prompt."}
              </p>
            </div>

            {/* Botão de geração */}
            <Button
              className="w-full gap-2"
              onClick={generateQuestions}
              disabled={isGenerating || (!selectedMaterials.length && !aiPrompt.trim())}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Gerando questões...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Gerar Questões</span>
                </>
              )}
            </Button>
          </CardContent>
        </Card>
        <GeneratedQuestions
          generatedQuestions={streamedQuestions}
          setGeneratedQuestions={setStreamedQuestions}
          isGenerating={isGenerating}
          isReasoning={isReasoning}
        />
      </div>
      <MaterialSelectorDialog
        materials={materials}
        selectedMaterials={selectedMaterials}
        setSelectedMaterials={setSelectedMaterials}
        showMaterialSelector={showMaterialSelector}
        setShowMaterialSelector={setShowMaterialSelector}
        toggleMaterialSelection={toggleMaterialSelection}
        getMaterialIcon={getMaterialIcon}
      />
    </TabsContent>
  )
}
