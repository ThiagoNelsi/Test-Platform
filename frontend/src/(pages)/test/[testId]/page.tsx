
import { useState, useEffect, useCallback, useRef } from "react";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  EyeClosed,
  Save,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Progress } from "@/src/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/src/components/ui/alert-dialog";
import { Card } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { useAppParams as useParams } from "@/src/components/router-helpers";
import { Skeleton } from "@/src/components/ui/skeleton";
import { errorToast, infoToast, successToast } from "@/lib/toasters";
import Header from "@/src/components/header";
import { Submission } from "@/lib/submission";
import { AlphabeticalRadioGroup } from "@/src/components/alphabetical-radio-input/radio-group";
import { AlphabeticalRadioItem } from "@/src/components/alphabetical-radio-input/radio-item";
import {
  useFinishSubmissionMutation,
  useSaveSubmissionMutation,
  useStartSubmissionMutation,
} from "@/src/hooks/use-api-queries";
import { getApiErrorMessage } from "@/lib/backend-api";
import { QueryError, QueryLoading } from "@/src/components/query-state";

export default function Test() {
  const { testId } = useParams<{ testId: string }>();
  const startMutation = useStartSubmissionMutation();
  const saveMutation = useSaveSubmissionMutation();
  const finishMutation = useFinishSubmissionMutation();
  const startSubmission = startMutation.mutateAsync;
  const saveProgress = saveMutation.mutateAsync;
  const finishExam = finishMutation.mutateAsync;
  const startRequestRef = useRef<{
    testId: number;
    promise: ReturnType<typeof startSubmission>;
  } | null>(null);
  const [startAttempt, setStartAttempt] = useState(0);
  const [loadError, setLoadError] = useState<unknown>(null);

  const [examData, setExamData] = useState<Submission | null>(null);

  // State for timer
  const [showTimer, setShowTimer] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [isTimeAlmostUp, setIsTimeAlmostUp] = useState(false);

  // State for dialogs
  const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false);

  // State for answers
  const [answers, setAnswers] = useState<Record<number, string>>({});

  // State for feedback
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState("");

  const totalQuestions =
    examData?.submission.sections.reduce(
      (acc, section) => acc + section.questions.length,
      0,
    ) ?? 0;

  // Calculate number of answered questions
  const answeredQuestions = Object.values(answers).filter(
    (answer) => answer !== ""
  ).length;

  // Handle answer change
  const handleAnswerChange = (questionId: number, answer: string) => {
    if (isSubmitting === "submitted") return;
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  // Format time as HH:MM:SS
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return [
      hours.toString().padStart(2, "0"),
      minutes.toString().padStart(2, "0"),
      secs.toString().padStart(2, "0"),
    ].join(":");
  };

  useEffect(() => {
    const numericTestId = Number(testId);
    if (!Number.isInteger(numericTestId) || numericTestId <= 0) {
      setLoadError(new Error("Identificador de prova inválido"));
      return;
    }

    setLoadError(null);
    const requestEntry =
      startRequestRef.current?.testId === numericTestId
        ? startRequestRef.current
        : { testId: numericTestId, promise: startSubmission(numericTestId) };
    startRequestRef.current = requestEntry;
    let cancelled = false;

    requestEntry.promise
      .then((res) => {
        if (cancelled) return;

        const now = new Date().getTime();
        const passedTime = now - (res.submission.startTime?.getTime() ?? now);
        const timeRemaining =
          (res.test.timer ?? 0) * 60 - Math.floor(passedTime / 1000);
        setExamData(Submission.fromJSON(res));
        setTimeRemaining(timeRemaining > 0 ? timeRemaining : 0);
        setIsTimerRunning(true);
        setShowTimer(true);
        setAnswers((res.submission.answers as Record<number, string>) ?? {});

        if (res.submission.finishTime) {
          setIsSubmitting("submitted");
          setIsTimerRunning(false);
        }
      })
      .catch((error) => {
        if (!cancelled) setLoadError(error);
      });

    return () => {
      cancelled = true;
    };
  }, [startAttempt, startSubmission, testId]);

  // Timer logic
  useEffect(() => {
    if (!isTimerRunning || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev - 1;
        // Check if time is almost up (less than 5 minutes)
        if (newTime <= 300 && !isTimeAlmostUp) {
          setIsTimeAlmostUp(true);
        }
        return newTime > 0 ? newTime : 0;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isTimerRunning, timeRemaining, isTimeAlmostUp]);

  // Handle exam submission
  const handleSubmitExam = useCallback(async () => {
    if (!examData?.submission.id) return;
    setIsSubmitting("submitting");
    try {
      const submission = await finishExam({
        submissionId: examData.submission.id,
        answers,
      });
      examData.submission.answers = answers;
      examData.submission.finishTime = submission.finishTime;
      setExamData(new Submission(examData.test, examData.submission));
      setIsSubmitting("submitted");
      setIsTimerRunning(false);
      successToast("Prova entregue com sucesso!");
    } catch (error) {
      setIsSubmitting("");
      errorToast(getApiErrorMessage(error, "Não foi possível entregar a prova"));
    }
  }, [answers, examData, finishExam]);

  // Handle save and continue later
  const handleSaveProgress = useCallback(async () => {
    if (isSubmitting === "submitted") return;
    if (!examData?.submission.id) return;

    setIsSavingProgress(true);
    try {
      await saveProgress({
        submissionId: examData.submission.id,
        answers,
      });
      examData.submission.answers = answers;
      setExamData(new Submission(examData.test, examData.submission));
      infoToast("Progresso salvo com sucesso!");
    } catch (error) {
      errorToast(getApiErrorMessage(error, "Não foi possível salvar o progresso"));
    } finally {
      setIsSavingProgress(false);
    }
  }, [answers, examData, isSubmitting, saveProgress]);

  if (loadError || startMutation.error) {
    return (
      <QueryError
        message={getApiErrorMessage(loadError || startMutation.error, "Erro ao carregar a prova.")}
        onRetry={() => {
          startRequestRef.current = null;
          startMutation.reset();
          setExamData(null);
          setStartAttempt((attempt) => attempt + 1);
        }}
      />
    );
  }

  if (startMutation.isPending || !examData) {
    return <QueryLoading message="Carregando a prova..." />;
  }

  return (
    <div className="h-screen overflow-y-auto bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Header />
      {/* Timer and Status */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b shadow-sm mb-4">
        <div className="container max-w-5xl mx-auto p-2 flex justify-between items-center">
          {Boolean(examData.test.timer) &&
            examData.test.timer !== null &&
            examData.test.timer > 0 && (
              <div className="flex items-center">
                {isSubmitting !== "submitted" && (
                  <>
                    <div
                      className={`text-sm flex items-center gap-2 ${
                        isTimeAlmostUp ? "text-red-500" : ""
                      }`}
                    >
                      Tempo restante:
                      <span className="w-[7ch]">
                        {showTimer ? (
                          formatTime(timeRemaining)
                        ) : (
                          <Skeleton className="animate-none bg-neutral-300 w-[7ch] h-2" />
                        )}
                      </span>
                    </div>
                    {showTimer || isTimeAlmostUp ? (
                      <Eye
                        onClick={() => !isTimeAlmostUp && setShowTimer(false)}
                        className="text-neutral-600 cursor-pointer ml-2 h-5 w-5 text-muted-foreground hover:text-primary transition-all"
                      />
                    ) : (
                      <EyeClosed
                        onClick={() => setShowTimer(true)}
                        className="text-neutral-600 cursor-pointer ml-2 h-5 w-5 text-muted-foreground hover:text-primary transition-all"
                      />
                    )}
                  </>
                )}
              </div>
            )}
          <div className="flex gap-2 md:items-end">
            {examData.test.dueDate && (
              <Badge variant="outline" className="font-normal">
                Entregar até:{" "}
                {examData.test.dueDate?.toLocaleDateString() +
                  " às " +
                  examData.test.dueDate?.toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
              </Badge>
            )}
            <Badge className="bg-verdigris-400 hover:bg-verdigris-400">
              Valor: {examData.test.value} pontos
            </Badge>
          </div>
        </div>
      </div>
      <div className="container max-w-[80ch] mx-auto p-4 text-sm">
        {/* Header */}
        <header className="container mx-auto bg-white dark:bg-gray-800">
          <Card className="p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-lg font-bold">
                  {examData.test.name}
                </h1>
              </div>
            </div>

            {examData.test.description && (
              <div className="mt-4 rounded-xl text-sm whitespace-pre-wrap">
                {examData.test.description}
              </div>
            )}
          </Card>
        </header>

        {/* Questions */}
        {examData.submission.sections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="container mx-auto mt-8">
            <h2 className="text-lg font-semibold">Seção {sectionIndex + 1}</h2>

            {section.questions.map((question, questionIndex) => (
              <Card key={sectionIndex + "" + questionIndex} className="mt-4">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-md font-semibold">
                      Questão {questionIndex + 1}
                    </h3>
                  </div>

                  {/* Render question content */}
                  <p
                    className="whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{
                      __html: question.content.statement,
                    }}
                  ></p>

                  <div className="mt-4">
                    <AlphabeticalRadioGroup
                      value={answers[question.id] || ""}
                      onValueChange={(value) =>
                        handleAnswerChange(question.id, value)
                      }
                      viewOnly={examData.submission.finishTime !== null}
                    >
                      {question.content.options.map((option, optionIndex) => (
                        <AlphabeticalRadioItem
                          key={question.id.toString() + optionIndex}
                          value={optionIndex.toString()}
                          innerHTML={option.value}
                        />
                      ))}
                    </AlphabeticalRadioGroup>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ))}
      </div>

      {/* Footer with Actions */}
      <footer className="sticky bottom-0 bg-white dark:bg-gray-800 border-t shadow-[0_-2px_10px_rgba(0,0,0,0.05)] p-4">
        <div className="container max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              Respostas: {answeredQuestions}/{totalQuestions}
            </span>
            <Progress
              indicatorColor="bg-verdigris-600"
              value={(answeredQuestions / totalQuestions) * 100}
              className="w-40 md:w-60 h-2"
            />
          </div>

          <div className="flex gap-3">
            {isSavingProgress ? (
              <Button variant="outline" className="gap-2" disabled>
                <Clock className="h-4 w-4 animate-spin" />
                <span>Salvando...</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleSaveProgress}
                disabled={isSubmitting === "submitted"}
              >
                <Save className="h-4 w-4" />
                <span>Salvar Progresso</span>
              </Button>
            )}
            {isSubmitting === "submitting" ? (
              <Button variant="outline" className="gap-2" disabled>
                <Clock className="h-4 w-4 animate-spin" />
                <span>Entregando...</span>
              </Button>
            ) : isSubmitting === "submitted" ? (
              <Button variant="outline" className="gap-2" disabled>
                <CheckCircle className="h-4 w-4 animate-pulse" />
                <span>Prova Entregue</span>
              </Button>
            ) : (
              <Button
                className="gap-2 bg-verdigris-400 hover:bg-verdigris-300"
                onClick={() => setShowSubmitConfirmation(true)}
              >
                <CheckCircle className="h-4 w-4" />
                <span>Entregar Prova</span>
              </Button>
            )}
          </div>
        </div>
      </footer>

      {/* Submit Confirmation Dialog */}
      <AlertDialog
        open={showSubmitConfirmation}
        onOpenChange={setShowSubmitConfirmation}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Entregar Prova?</AlertDialogTitle>
            <AlertDialogDescription>
              {answeredQuestions < totalQuestions && (
                <span className="mb-4 flex items-start gap-3 p-2 bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-200 rounded-md">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <span>
                    Atenção: Você ainda não respondeu todas as questões. Tem
                    certeza que deseja entregar a prova agora?
                  </span>
                </span>
              )}
              Você respondeu {answeredQuestions} de {totalQuestions} questões.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmitExam}>
              Confirmar Entrega
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
