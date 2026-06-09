import { Prisma, type PrismaClient, type Test } from '@prisma/client';
import { Router, type Request, type Response } from 'express';
import type { AuthService } from '../auth/service';
import { requireUser } from './shared/auth';
import { badRequest, internalServerError, notFound } from './shared/responses';

export type QuestionsPrisma = Pick<PrismaClient, 'question' | '$queryRaw' | '$transaction'>;

type QuestionsRouterOptions = {
  authService: AuthService;
  prisma: QuestionsPrisma;
};

const levelOptions = ['easy', 'medium', 'hard'];

function normalizeLevel(level: unknown): number | null | undefined {
  if (level === undefined) return undefined;
  if (level === null || level === '') return null;

  if (typeof level === 'number' && Number.isInteger(level)) {
    return level;
  }

  if (typeof level === 'string') {
    const index = levelOptions.indexOf(level.toLowerCase());
    if (index >= 0) return index;

    const numeric = Number(level);
    if (Number.isInteger(numeric)) return numeric;
  }

  return undefined;
}

function parseContent(value: unknown): Prisma.InputJsonValue | Prisma.JsonNull {
  if (value === null) return Prisma.JsonNull;
  if (typeof value === 'string') {
    return JSON.parse(value) as Prisma.InputJsonValue;
  }

  return value as Prisma.InputJsonValue;
}

function sameQuestionPayload(
  current: { type: string; level: number | null; content: unknown; tags: number[] },
  incoming: { type: string; level: number | null; content: unknown; tags: number[] },
): boolean {
  const normalize = (value: { type: string; level: number | null; content: unknown; tags: number[] }) => ({
    ...value,
    tags: [...value.tags].sort((a, b) => a - b),
  });

  return JSON.stringify(normalize(current)) === JSON.stringify(normalize(incoming));
}

export function createQuestionsRouter(options: QuestionsRouterOptions): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response) => {
    const user = await requireUser(req, res, options.authService);
    if (!user) return;

    const id = Number(req.query.id);

    try {
      if (Number.isFinite(id)) {
        const question = await options.prisma.question.findUnique({
          where: { id },
          include: { tags: true },
        });

        if (!question || question.deletedAt) {
          notFound(res, 'Question not found');
          return;
        }

        res.json({ question });
        return;
      }

      const questions = await options.prisma.question.findMany({
        where: {
          authorId: user.id,
          originalQuestionId: null,
          deletedAt: null,
        },
        include: { tags: true },
        orderBy: { updatedAt: 'desc' },
      });

      res.json({ questions });
    } catch (error) {
      internalServerError(res, error, 'Failed to fetch questions');
    }
  });

  router.post('/', async (req: Request, res: Response) => {
    const user = await requireUser(req, res, options.authService);
    if (!user) return;

    const { type, level, content, source, tags } = req.body ?? {};
    if (!type || content === undefined) {
      badRequest(res, 'Missing required fields');
      return;
    }

    const normalizedLevel = normalizeLevel(level);
    if (level !== undefined && normalizedLevel === undefined) {
      badRequest(res, 'Invalid level');
      return;
    }

    let parsedContent: Prisma.InputJsonValue | Prisma.JsonNull;
    try {
      parsedContent = parseContent(content);
    } catch {
      badRequest(res, 'Invalid content payload');
      return;
    }

    const tagIds = Array.isArray(tags)
      ? tags.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0)
      : [];

    try {
      const question = await options.prisma.question.create({
        data: {
          type,
          level: normalizedLevel,
          authorId: user.id,
          content: parsedContent,
          source: source || 'MANUAL',
          ...(tagIds.length > 0
            ? {
                tags: {
                  connect: tagIds.map((tagId) => ({ id: tagId })),
                },
              }
            : {}),
        },
        include: { tags: true },
      });

      res.json({ question });
    } catch (error) {
      internalServerError(res, error, 'Failed to create question');
    }
  });

  router.post('/bulk', async (req: Request, res: Response) => {
    const user = await requireUser(req, res, options.authService);
    if (!user) return;

    const questions = req.body?.questions;
    if (!Array.isArray(questions) || questions.length === 0) {
      badRequest(res, 'Missing questions');
      return;
    }

    try {
      const parsed = questions.map((question) => ({
        type: String(question?.type ?? ''),
        level: normalizeLevel(question?.level) ?? null,
        authorId: user.id,
        content: parseContent(question?.content ?? {}),
        source: question?.source ? String(question.source) : 'MANUAL',
      }));

      if (parsed.some((question) => !question.type)) {
        badRequest(res, 'Invalid question payload');
        return;
      }

      const result = await options.prisma.question.createMany({ data: parsed });
      res.json(result);
    } catch (error) {
      internalServerError(res, error, 'Failed to create questions');
    }
  });

  router.patch('/:id', async (req: Request, res: Response) => {
    const user = await requireUser(req, res, options.authService);
    if (!user) return;

    const questionId = Number(req.params.id);
    if (!Number.isInteger(questionId) || questionId <= 0) {
      badRequest(res, 'Invalid question id');
      return;
    }

    const { type, level, content, tags } = req.body ?? {};
    if (!type || content === undefined || !Array.isArray(tags)) {
      badRequest(res, 'Missing required fields');
      return;
    }

    const normalizedLevel = normalizeLevel(level);
    if (normalizedLevel === undefined) {
      badRequest(res, 'Invalid level');
      return;
    }

    const tagIds = tags
      .map((value: unknown) => Number(value))
      .filter((value: number) => Number.isInteger(value) && value > 0);

    let parsedContent: Prisma.InputJsonValue | Prisma.JsonNull;
    try {
      parsedContent = parseContent(content);
    } catch {
      badRequest(res, 'Invalid content payload');
      return;
    }

    try {
      const question = await options.prisma.question.findUnique({
        where: { id: questionId },
        include: { tags: true },
      });

      if (!question || question.deletedAt) {
        notFound(res, 'Question not found');
        return;
      }

      const equalPayload = sameQuestionPayload(
        {
          type: question.type,
          level: question.level,
          content: question.content,
          tags: question.tags.map((tag) => tag.id),
        },
        {
          type,
          level: normalizedLevel,
          content: parsedContent,
          tags: tagIds,
        },
      );

      if (equalPayload) {
        res.json({ ok: true, updated: false });
        return;
      }

      const testContainingThisVersion: Test[] = await options.prisma.$queryRaw`
        SELECT *
        FROM "Test"
        WHERE EXISTS (
            SELECT 1
            FROM jsonb_array_elements("Test".sections) AS section
            WHERE EXISTS (
                SELECT 1
                FROM jsonb_array_elements(section->'questions') AS question
                WHERE (question->>'id')::int = ${questionId}
                AND (question->>'version')::int = ${question.version}
            )
        )
        LIMIT 1;
      `;

      await options.prisma.$transaction(async (tx) => {
        if (testContainingThisVersion.length > 0) {
          const snapshot = { ...question } as Prisma.QuestionUncheckedCreateInput;
          delete snapshot.id;
          delete snapshot.createdAt;
          delete snapshot.tags;

          await tx.question.create({
            data: {
              ...snapshot,
              originalQuestionId: questionId,
            },
          });
        }

        const questionTags = await tx.question.findUnique({
          where: { id: questionId },
          select: {
            tags: {
              select: { id: true },
            },
          },
        });

        const disconnectTags = (questionTags?.tags ?? [])
          .filter((tag) => !tagIds.includes(tag.id))
          .map((tag) => ({ id: tag.id }));

        await tx.question.update({
          where: {
            id: questionId,
            authorId: user.id,
          },
          data: {
            updatedAt: new Date(),
            type,
            level: normalizedLevel,
            content: parsedContent,
            version: question.version + 1,
            tags: {
              connect: tagIds.map((tagId) => ({ id: tagId })),
              disconnect: disconnectTags,
            },
          },
        });
      });

      res.json({ ok: true, updated: true });
    } catch (error) {
      internalServerError(res, error, 'Failed to update question');
    }
  });

  router.delete('/', async (req: Request, res: Response) => {
    const user = await requireUser(req, res, options.authService);
    if (!user) return;

    const questionIds = req.body?.questionIds;
    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      badRequest(res, 'Missing questionIds');
      return;
    }

    const ids = questionIds
      .map((value: unknown) => Number(value))
      .filter((value: number) => Number.isInteger(value) && value > 0);

    if (ids.length === 0) {
      badRequest(res, 'Missing questionIds');
      return;
    }

    try {
      const result = await options.prisma.question.updateMany({
        where: {
          id: { in: ids },
          authorId: user.id,
        },
        data: {
          deletedAt: new Date(),
        },
      });

      if (result.count === 0) {
        notFound(res, 'No questions found to delete');
        return;
      }

      res.json({ ok: true, count: result.count });
    } catch (error) {
      internalServerError(res, error, 'Failed to delete questions');
    }
  });

  return router;
}