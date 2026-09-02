import { io, type Socket } from "socket.io-client";

export type QuestionGenerationPrompt = {
  prompt: string;
  model: string;
  documents: string[];
};

export type QuestionGenerationServerEvents = {
  chunk: (chunk: string) => void;
  "reasoning-chunk": (chunk: string) => void;
  "reasoning-started": () => void;
  "reasoning-finished": () => void;
  "generation-finished": () => void;
  "generation-error": (message: string) => void;
};

export type QuestionGenerationClientEvents = {
  prompt: (payload: QuestionGenerationPrompt) => void;
};

const configuredBackendUrl = import.meta.env?.VITE_BACKEND_URL?.trim() ?? "";
const backendUrl =
  configuredBackendUrl.replace(/\/+$/g, "") ||
  (import.meta.env?.DEV || typeof window === "undefined"
    ? "http://localhost:8000"
    : undefined);

export const socket: Socket<
  QuestionGenerationServerEvents,
  QuestionGenerationClientEvents
> = io(backendUrl, {
  autoConnect: false,
  transports: ["websocket"],
  withCredentials: true,
}) as Socket<QuestionGenerationServerEvents, QuestionGenerationClientEvents>;
