import { useCallback, useEffect, useRef, useState } from "react"
import GeneratedQuestions from "./generated-questions"
import { TabsContent } from "@/src/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Label } from "@/src/components/ui/label";
import { Button } from "@/src/components/ui/button";
import { FileText, ImageIcon, Loader2, Plus, Sparkles, X } from "lucide-react";
import { Textarea } from "@/src/components/ui/textarea";
import MaterialSelectorDialog from "./material-selector";
import { socket } from "@/src/socket";
import HelpTooltip from "@/src/components/ui/help-tooltip";
import PromptExamples from "./prompt-examples";
import type { Resource } from "@/lib/types"
import { useResourcesQuery } from "@/src/hooks/use-api-queries"
import { QueryError } from "@/src/components/query-state"
import { Alert, AlertDescription, AlertTitle } from "@/src/components/ui/alert"
import { errorToast } from "@/lib/toasters"

export type Material = Resource

export type StreamedQuestion = {
  statement?: string
  options?: string[]
  answer?: string
  topic?: string
}

type CreateWithAIProps = {
  preSelectedResource?: string
}

function getSocketErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "string" && error.trim()) {
    return error;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.trim()
  ) {
    return error.message;
  }

  return fallback;
}

export default function CreateWithAI({ preSelectedResource }: CreateWithAIProps) {
  const materialsQuery = useResourcesQuery("PROCESSED")
  const materials = materialsQuery.data ?? []
  const modelOptions = ["gpt-5.4-mini", "o4-mini", "o3-mini", "gpt-4o-mini", "gpt-3.5-turbo"]

  const [selectedMaterials, setSelectedMaterials] = useState<number[]>([
    ...(preSelectedResource ? [parseInt(preSelectedResource)] : []),
  ])
  const [showMaterialSelector, setShowMaterialSelector] = useState(preSelectedResource === undefined ? true : false);
  const [aiPrompt, setAiPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isReasoning, setIsReasoning] = useState(false)
  const [streamedQuestions, setStreamedQuestions] = useState<StreamedQuestion[]>([])
  const [model, setModel] = useState("gpt-5.4-mini")

  // socket
  const [isConnected, setIsConnected] = useState(false);
  const [transport, setTransport] = useState("N/A");
  const [socketError, setSocketError] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const isGeneratingRef = useRef(false);

  const toggleMaterialSelection = (id: number) => {
    setSelectedMaterials((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]))
  }

  const getMaterialIcon = (type: string) => {
    type = type.split("/")[1]
    switch (type) {
      case "pdf":
        return <FileText className="h-5 w-5 shrink-0 text-red-500" />
      case "docx":
        return <FileText className="h-5 w-5 shrink-0 text-blue-500" />
      case "pptx":
        return <FileText className="h-5 w-5 shrink-0 text-orange-500" />
      case "image":
        return <ImageIcon className="h-5 w-5 shrink-0 text-green-500" />
      default:
        return <FileText className="h-5 w-5 shrink-0 text-gray-500" />
    }
  }

  // Estado para armazenar o texto parcial recebido e o buffer de parsing
  const parsingState = useRef({
    currentTag: null as null | string,
    currentContent: "",
    currentQuestion: {} as StreamedQuestion,
    questions: [] as StreamedQuestion[],
    options: [] as string[],
  });

  const resetParsingState = useCallback(() => {
    parsingState.current = {
      currentTag: null,
      currentContent: "",
      currentQuestion: {},
      questions: [],
      options: [],
    };
  }, []);

  const generateQuestions = () => {
    const prompt = aiPrompt.trim();

    if (!prompt) {
      const message = "Descreva as questões que deseja gerar.";
      setGenerationError(message);
      return;
    }

    if (!socket.connected) {
      const message = "O gerador ainda está se conectando. Tente novamente em instantes.";
      setSocketError(message);
      socket.connect();
      return;
    }

    const documents = selectedMaterials
      .map((id) => materials.find((material) => material.id === id)?.objectKey)
      .filter((objectKey): objectKey is string => Boolean(objectKey));

    resetParsingState();
    setStreamedQuestions([]);
    setGenerationError(null);
    setSocketError(null);
    setIsReasoning(false);
    isGeneratingRef.current = true;
    setIsGenerating(true);

    try {
      socket.emit("prompt", {
        prompt,
        model,
        documents,
      });
    } catch (error) {
      handleGenerationError(error, "Não foi possível iniciar a geração de questões.");
    }
  };

  // Função de parsing incremental
  const parseChunkedQuestions = useCallback((chunk: string) => {
    const state = parsingState.current;
    const text = state.currentContent + chunk;
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
          case "OPTION": {
            const trimmedOption = content.trim();
            if (trimmedOption && state.options[state.options.length - 1] !== trimmedOption) {
              state.options.push(trimmedOption);
            }
            break;
          }
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
        if (/\[TOPIC\][^[]*$/g.test(text) || chunk.endsWith("\n")) {
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
        case "OPTION": {
          const trimmedOptionRest = content.trim();
          if (trimmedOptionRest && state.options[state.options.length - 1] !== trimmedOptionRest) {
            state.options.push(trimmedOptionRest);
          }
          break;
        }
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
  }, []);

  const finalizeParsingState = useCallback(() => {
    const state = parsingState.current;
    const remainingContent = state.currentContent.trim();

    switch (state.currentTag) {
      case "STATEMENT":
        if (remainingContent) state.currentQuestion.statement = remainingContent;
        break;
      case "OPTION":
        if (remainingContent && state.options[state.options.length - 1] !== remainingContent) {
          state.options.push(remainingContent);
        }
        break;
      case "ANSWER":
        if (remainingContent) state.currentQuestion.answer = remainingContent;
        break;
      case "TOPIC":
        if (remainingContent) state.currentQuestion.topic = remainingContent;
        break;
    }

    if (Object.keys(state.currentQuestion).length > 0 || state.options.length > 0) {
      state.currentQuestion.options = state.options.slice();
      state.questions.push({ ...state.currentQuestion });
    }

    const questions = state.questions.map((question) => ({
      ...question,
      options: question.options ? question.options.slice() : question.options,
    }));

    resetParsingState();
    return questions;
  }, [resetParsingState]);

  const shuffleQuestionOptions = useCallback((questions: StreamedQuestion[]) => {
    return questions.map((question) => {
      const options = question.options ?? [];
      const answerIndex = Number(question.answer);

      if (
        options.length === 0 ||
        !Number.isInteger(answerIndex) ||
        answerIndex < 0 ||
        answerIndex >= options.length
      ) {
        return question;
      }

      const correctOption = options[answerIndex];
      const shuffledOptions = options.slice();

      for (let index = shuffledOptions.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [shuffledOptions[index], shuffledOptions[swapIndex]] = [
          shuffledOptions[swapIndex],
          shuffledOptions[index],
        ];
      }

      return {
        ...question,
        options: shuffledOptions,
        answer: String(shuffledOptions.indexOf(correctOption)),
      };
    });
  }, []);

  const handleGenerationError = useCallback((error: unknown, fallback: string) => {
    const message = getSocketErrorMessage(error, fallback);
    isGeneratingRef.current = false;
    setIsGenerating(false);
    setIsReasoning(false);
    setGenerationError(message);
    errorToast(message);
  }, []);

  // Mantém uma única conexão enquanto a tela de geração estiver montada e
  // garante que todos os eventos sejam removidos ao sair da rota.
  useEffect(() => {
    let engine: typeof socket.io.engine | undefined;

    const onUpgrade = (nextTransport: { name: string }) => {
      setTransport(nextTransport.name);
    };

    const detachEngineListener = () => {
      engine?.off("upgrade", onUpgrade);
      engine = undefined;
    };

    function onConnect() {
      setIsConnected(true);
      setSocketError(null);

      detachEngineListener();
      engine = socket.io.engine;
      engine?.on("upgrade", onUpgrade);
      setTransport(engine?.transport.name ?? "websocket");
    }

    function onDisconnect(reason: string) {
      setIsConnected(false);
      setTransport("N/A");

      if (reason === "io client disconnect") return;

      const message = "A conexão com o gerador foi interrompida.";
      setSocketError(`${message} Tente novamente em instantes.`);
      if (isGeneratingRef.current) {
        handleGenerationError(message, message);
      }
    }

    function onConnectError() {
      const message = "Não foi possível conectar ao gerador de questões.";
      setIsConnected(false);
      setTransport("N/A");
      setSocketError(message);

      if (isGeneratingRef.current) {
        handleGenerationError(message, message);
      }
    }

    function onChunk(chunk: string) {
      parseChunkedQuestions(chunk);
    }

    function onReasoningStarted() {
      setIsReasoning(true);
    }

    function onReasoningFinished() {
      setIsReasoning(false);
    }

    function onReasoningChunk() {
      setIsReasoning(true);
    }

    function onGenerationFinished() {
      const completedQuestions = finalizeParsingState();
      isGeneratingRef.current = false;
      setIsGenerating(false);
      setIsReasoning(false);
      setStreamedQuestions(shuffleQuestionOptions(completedQuestions));
    }

    function onGenerationError(message: string) {
      handleGenerationError(message, "Não foi possível gerar as questões.");
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("chunk", onChunk);
    socket.on("reasoning-chunk", onReasoningChunk);
    socket.on("reasoning-started", onReasoningStarted);
    socket.on("reasoning-finished", onReasoningFinished);
    socket.on("generation-finished", onGenerationFinished);
    socket.on("generation-error", onGenerationError);

    if (socket.connected) {
      onConnect();
    } else {
      socket.connect();
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("chunk", onChunk);
      socket.off("reasoning-chunk", onReasoningChunk);
      socket.off("reasoning-started", onReasoningStarted);
      socket.off("reasoning-finished", onReasoningFinished);
      socket.off("generation-finished", onGenerationFinished);
      socket.off("generation-error", onGenerationError);
      detachEngineListener();
      socket.disconnect();
    };
  }, [finalizeParsingState, handleGenerationError, parseChunkedQuestions, shuffleQuestionOptions]);

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

              {selectedMaterials.length > 0 && (
                <div className="mt-3 space-y-2">
                  {selectedMaterials.map((id) => {
                    const material = materials?.find((m) => m.id === id)
                    if (!material) return null

                    return (
                      <div
                        key={id}
                        className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-md border-red-500"
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
              {materialsQuery.error && (
                <QueryError
                  message="Não foi possível carregar os materiais processados."
                  onRetry={materialsQuery.refetch}
                  isRetrying={materialsQuery.isFetching}
                />
              )}
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => setShowMaterialSelector(true)}
              >
                <Plus className="h-4 w-4" />
                <span>Adicionar materiais</span>
              </Button>
            </div>
            {(generationError || (!isConnected && socketError)) && (
              <Alert variant="destructive">
                <AlertTitle>Não foi possível gerar as questões</AlertTitle>
                <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                  <span>{generationError ?? socketError}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setGenerationError(null);
                      setSocketError(null);
                      if (!socket.connected) socket.connect();
                    }}
                  >
                    Tentar novamente
                  </Button>
                </AlertDescription>
              </Alert>
            )}
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
              disabled={isGenerating || !isConnected || !aiPrompt.trim()}
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
            <p className="text-center text-xs text-muted-foreground" aria-live="polite">
              {isConnected
                ? `Socket conectado (${transport})`
                : socketError ?? "Conectando ao gerador..."}
            </p>
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
