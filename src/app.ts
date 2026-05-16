import cors from 'cors';
import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';
import http from 'http';
import OpenAI from 'openai';
import { Server, type Socket } from 'socket.io';
import { createAuthService } from './auth/service';
import { getOptionalEnv, getRequiredEnv } from './config/env';
import { createEmbeddingsClient } from './database/embeddings';
import { createPrismaClient } from './database/prisma';
import { createQuestionGenerator } from './questions/generator';
import { enemPrompt } from './questions/prompt';
import { createAuthRouter } from './routes/auth';

export type PromptPayload = {
  prompt?: string;
  model?: string;
  documents?: string[];
};

type QuestionGenerator = ReturnType<typeof createQuestionGenerator>;

export async function handlePromptRequest(
  generator: QuestionGenerator,
  socket: Pick<Socket, 'emit'>,
  payload?: PromptPayload,
): Promise<void> {
  const prompt = payload?.prompt ?? '';
  const model = payload?.model ?? '';
  const documents = payload?.documents ?? [];

  try {
    console.log('Prompt received: ' + prompt, model, documents);
    await generator.generateQuestion(prompt, model, documents, socket);
  } catch (error) {
    console.error('Prompt handling error', error);
    socket.emit('generation-error', error instanceof Error ? error.message : 'Unexpected generation error');
  }
}

export function createApp(authService: ReturnType<typeof createAuthService>): Express {
  const app = express();

  app.use(cors({ origin: getOptionalEnv('FRONTEND_URL', 'http://localhost:3000'), credentials: true }));
  app.use(cookieParser());
  app.use(express.json());

  app.get('/', (_req, res) => {
    res.send('Hello, TypeScript Express!');
  });

  app.use('/auth', createAuthRouter(authService));

  return app;
}

function createDefaultAuthService() {
  return createAuthService({
    prisma: createPrismaClient(),
    fetchFn: fetch,
    jwtSecret: getRequiredEnv('JWT_SECRET'),
    googleClientId: getRequiredEnv('GOOGLE_CLIENT_ID'),
    googleClientSecret: getRequiredEnv('GOOGLE_CLIENT_SECRET'),
    backendUrl: getOptionalEnv('BACKEND_URL', 'http://localhost:8000'),
    frontendUrl: getOptionalEnv('FRONTEND_URL', 'http://localhost:3000'),
    isProduction: process.env.NODE_ENV === 'production',
  });
}

function createDefaultQuestionGenerator() {
  return createQuestionGenerator({
    openaiClient: new OpenAI({ apiKey: getRequiredEnv('OPENAI_API_KEY') }),
    sqlClient: createEmbeddingsClient(getRequiredEnv('EMBEDDINGS_DATABASE_URL')),
    promptTemplate: enemPrompt,
  });
}

if (require.main === module) {
  const app = createApp(createDefaultAuthService());
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: getOptionalEnv('FRONTEND_URL', 'http://localhost:3000'),
      credentials: true,
    },
  });

  const generator = createDefaultQuestionGenerator();

  io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('disconnect', () => {
      console.log('A user disconnected');
    });

    socket.on('message', (msg) => {
      console.log('Message received: ' + msg);
    });

    socket.on('prompt', (payload) => {
      void handlePromptRequest(generator, socket, payload);
    });
  });

  server.listen(8000, () => {
    console.log('Server is listening on port: 8000');
  });
}
