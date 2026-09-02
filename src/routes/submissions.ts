import { Prisma, type PrismaClient, type Test } from '@prisma/client';
import type {
  CreateSubmissionRequest,
  CreateSubmissionResponse,
  FinishSubmissionResponse,
  SaveSubmissionRequest,
  SaveSubmissionResponse,
} from 'api-contracts';
import { Router, type Request, type Response } from 'express';
import type { AuthService } from '../auth/service';
import { requireUser } from './shared/auth';
import { badRequest, forbidden, internalServerError, notFound } from './shared/responses';
import { toSubmissionDto, toSubmissionTestDto } from './shared/serializers';

type QuestionRef = {
  questionId: number;
  version: number;
};

type ParsedSection = {
  shuffle?: boolean;
  count?: number;
  questions: QuestionRef[];
};

type SubmissionQuestion = {
  id: number;
  originalQuestionId: number | null;
  content: unknown;
  type: string;
  version: number;
};

export type SubmissionsPrisma = Pick<PrismaClient, 'submission' | 'test' | 'question'>;

type SubmissionsRouterOptions = {
  authService: AuthService;
  prisma: SubmissionsPrisma;
};

function stripAnswers<T extends { sections: unknown }>(submission: T): T {
  const sections = Array.isArray(submission.sections) ? submission.sections : [];

  return {
    ...submission,
    sections: sections.map((section) => {
      const questionList = Array.isArray((section as Record<string, unknown>).questions)
        ? ((section as Record<string, unknown>).questions as Array<Record<string, unknown>>)
        : [];

      return {
        ...(section as Record<string, unknown>),
        questions: questionList.map((question) => ({
          ...question,
          content: {
            ...((question.content as Record<string, unknown>) ?? {}),
            answer: undefined,
          },
        })),
      };
    }),
  } as T;
}

function matchQuestion(
  source: QuestionRef,
  questions: SubmissionQuestion[],
): SubmissionQuestion | undefined {
  return questions.find((question) => {
    if (question.originalQuestionId) {
      return question.originalQuestionId === source.questionId;
    }
    return question.id === source.questionId;
  });
}

function shuffle<T>(array: T[]): T[] {
  const copied = [...array];
  for (let i = copied.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copied[i], copied[j]] = [copied[j], copied[i]];
  }
  return copied;
}

async function generateSections(prisma: SubmissionsPrisma, test: Test): Promise<Prisma.InputJsonValue | null> {
  const parsedSections = Array.isArray(test.sections) ? (test.sections as ParsedSection[]) : [];

  const questionList = parsedSections.flatMap((section) => section.questions ?? []);

  const whereClauses = questionList
    .filter((question) => Number.isInteger(question.questionId) && Number.isInteger(question.version))
    .map((question) => ({
      OR: [{ id: question.questionId }, { originalQuestionId: question.questionId }],
      version: question.version,
    }));

  const questions = await prisma.question.findMany({
    where: {
      OR: whereClauses.length > 0 ? whereClauses : [{ id: -1 }],
    },
    select: {
      id: true,
      originalQuestionId: true,
      content: true,
      type: true,
      version: true,
    },
  });

  const sections = parsedSections.map((section) => {
    if (section.count !== undefined) {
      const selectedQuestions: Array<SubmissionQuestion | undefined> = [];
      const availableQuestions = [...section.questions];

      if (availableQuestions.length < section.count) {
        return null;
      }

      for (let i = 0; i < section.count; i += 1) {
        const randomIndex = Math.floor(Math.random() * availableQuestions.length);
        const [questionRef] = availableQuestions.splice(randomIndex, 1);
        selectedQuestions.push(matchQuestion(questionRef, questions));
      }

      return {
        count: section.count,
        questions: selectedQuestions,
      };
    }

    if (section.shuffle !== undefined) {
      return {
        shuffle: section.shuffle,
        questions: shuffle(section.questions).map((questionRef) => matchQuestion(questionRef, questions)),
      };
    }

    return {
      questions: section.questions.map((questionRef) => matchQuestion(questionRef, questions)),
    };
  });

  if (sections.some((section) => section === null)) {
    return null;
  }

  return sections as Prisma.InputJsonValue;
}

export function createSubmissionsRouter(options: SubmissionsRouterOptions): Router {
  const router = Router();

  router.post('/', async (req: Request, res: Response) => {
    const user = await requireUser(req, res, options.authService);
    if (!user) return;

    const payload = (req.body ?? {}) as Partial<CreateSubmissionRequest>;
    const testId = Number(payload.testId);

    if (!Number.isInteger(testId) || testId <= 0) {
      badRequest(res, 'Invalid testId');
      return;
    }

    const select = {
      id: true,
      answers: true,
      finishTime: true,
      score: true,
      startTime: true,
      sections: true,
    };

    try {
      const submissionExists = await options.prisma.submission.findFirst({
        where: {
          testId,
          userId: user.id,
        },
        select,
      });

      const test = await options.prisma.test.findFirst({
        where: {
          id: testId,
          deletedAt: null,
          status: 'published',
        },
        include: {
          classroom: {
            select: {
              name: true,
              students: {
                select: { id: true },
              },
            },
          },
        },
      });

      if (!test) {
        notFound(res, 'Test not found');
        return;
      }

      const userAllowed = Boolean(test.classroom?.students.some((student) => student.id === user.id));
      if (!userAllowed) {
        forbidden(res);
        return;
      }

      if (submissionExists) {
        const response: CreateSubmissionResponse = {
          test: toSubmissionTestDto({
            id: test.id,
            name: test.name,
            description: test.description,
            value: test.value,
            dueDate: test.dueDate,
            timer: test.timer,
            classroom: test.classroom?.name,
          }),
          submission: toSubmissionDto(stripAnswers(submissionExists)),
        };
        res.json(response);
        return;
      }

      const sections = await generateSections(options.prisma, test);

      if (!sections) {
        badRequest(res, 'Unable to generate sections');
        return;
      }

      const submission = await options.prisma.submission.create({
        data: {
          testId: test.id,
          userId: user.id,
          sections,
        },
        select,
      });

      const response: CreateSubmissionResponse = {
        test: toSubmissionTestDto({
          id: test.id,
          name: test.name,
          description: test.description,
          value: test.value,
          dueDate: test.dueDate,
          timer: test.timer,
          classroom: test.classroom?.name,
        }),
        submission: toSubmissionDto(stripAnswers(submission)),
      };
      res.json(response);
    } catch (error) {
      internalServerError(res, error, 'Failed to create submission');
    }
  });

  router.patch('/:id/save', async (req: Request, res: Response) => {
    const user = await requireUser(req, res, options.authService);
    if (!user) return;

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      badRequest(res, 'Invalid submission id');
      return;
    }

    const payload = (req.body ?? {}) as Partial<SaveSubmissionRequest>;
    if (!payload.answers || typeof payload.answers !== 'object') {
      badRequest(res, 'Missing answers');
      return;
    }

    try {
      const submission = await options.prisma.submission.findFirst({
        where: {
          id,
          userId: user.id,
          finishTime: null,
        },
      });

      if (!submission) {
        notFound(res, 'Submission not found');
        return;
      }

      const updatedSubmission = await options.prisma.submission.update({
        where: { id: submission.id },
        data: {
          answers: payload.answers as Prisma.InputJsonValue,
        },
      });

      const response: SaveSubmissionResponse = {
        submission: toSubmissionDto(updatedSubmission),
      };
      res.json(response);
    } catch (error) {
      internalServerError(res, error, 'Failed to save submission');
    }
  });

  router.patch('/:id/finish', async (req: Request, res: Response) => {
    const user = await requireUser(req, res, options.authService);
    if (!user) return;

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      badRequest(res, 'Invalid submission id');
      return;
    }

    const payload = (req.body ?? {}) as Partial<SaveSubmissionRequest>;
    if (!payload.answers || typeof payload.answers !== 'object') {
      badRequest(res, 'Missing answers');
      return;
    }

    try {
      const submission = await options.prisma.submission.findFirst({
        where: {
          id,
          userId: user.id,
          finishTime: null,
        },
      });

      if (!submission) {
        notFound(res, 'Submission not found');
        return;
      }

      const updatedSubmission = await options.prisma.submission.update({
        where: { id: submission.id },
        data: {
          answers: payload.answers as Prisma.InputJsonValue,
          finishTime: new Date(),
        },
      });

      const response: FinishSubmissionResponse = {
        submission: toSubmissionDto(updatedSubmission),
      };
      res.json(response);
    } catch (error) {
      internalServerError(res, error, 'Failed to finish submission');
    }
  });

  return router;
}
