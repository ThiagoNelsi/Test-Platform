"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  Eye,
  EyeClosed,
  EyeOff,
  Save,
  X,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Progress } from "@/app/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { useParams } from "next/navigation";
import { Skeleton } from "@/app/components/ui/skeleton";
import {
  createSubmission,
  finishSubmission,
  saveSubmission,
} from "@/lib/submission-service";
import { errorToast, infoToast, successToast } from "@/lib/toasters";
import Header from "@/app/components/header";
import { Submission } from "@/lib/submission";
import { AlphabeticalRadioGroup } from "@/app/components/alphabetical-radio-input/radio-group";
import { AlphabeticalRadioItem } from "@/app/components/alphabetical-radio-input/radio-item";

export default function Test() {
  const { testId } = useParams<{ testId: string }>();

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
    (examData?.submission.sections as Array<any>)?.reduce(
      (acc: number, section: any) => acc + section.questions.length,
      0
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
    async function fetchExamData() {
      const res = await createSubmission(Number(testId));
      console.log(
        "%c🤪 ~ file: /home/thiago/Test-Platform/app/prova/[testId]/page.tsx:77 [] -> res : ",
        "color: #d673cf",
        res
      );

      if (!res) {
        return errorToast("Erro ao carregar a prova.");
      }

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
    }
    fetchExamData();
  }, []);

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
    setIsSubmitting("submitting");
    await finishSubmission(Number(examData?.submission.id), answers);
    setIsSubmitting("submitted");
    successToast("Prova entregue com sucesso!");
  }, [answers]);

  // Handle save and continue later
  const handleSaveProgress = useCallback(async () => {
    if (isSubmitting === "submitted") return;

    setIsSavingProgress(true);
    await saveSubmission(Number(examData?.submission.id), answers);
    setIsSavingProgress(false);
    infoToast("Progresso salvo com sucesso!");
  }, [answers]);

  if (!examData) return <div>Carregando...</div>;

  console.log(examData);

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
