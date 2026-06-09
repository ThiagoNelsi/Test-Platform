import { Prisma, type PrismaClient } from '@prisma/client';
import { Router, type Request, type Response } from 'express';
import type { AuthService } from '../auth/service';
import { requireUser } from './shared/auth';
import { badRequest, internalServerError, notFound } from './shared/responses';

export type RepositoryPrisma = Pick<PrismaClient, 'repositoryQuestion' | 'question'>;

type RepositoryRouterOptions = {
  authService: AuthService;
  prisma: RepositoryPrisma;
};

export function createRepositoryRouter(options: RepositoryRouterOptions): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response) => {
    const user = await requireUser(req, res, options.authService);
    if (!user) return;

    const id = Number(req.query.id);

    try {
      if (Number.isFinite(id)) {
        const question = await options.prisma.repositoryQuestion.findUnique({
          where: { id },
        });

        if (!question || question.deletedAt) {
          notFound(res, 'Question not found');
          return;
        }

        res.json({ question });
        return;
      }

      const questions = await options.prisma.repositoryQuestion.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ questions });
    } catch (error) {
      internalServerError(res, error, 'Failed to fetch repository question(s)');
    }
  });

  router.post('/', async (req: Request, res: Response) => {
    const user = await requireUser(req, res, options.authService);
    if (!user) return;

    const { type, level, content, subjects, tags, source } = req.body ?? {};

    if (!type || content === undefined || !Array.isArray(subjects) || !Array.isArray(tags)) {
      badRequest(res, 'Missing required fields');
      return;
    }

    try {
      const question = await options.prisma.repositoryQuestion.create({
        data: {
          type,
          level,
          content,
          subjects,
          tags,
          source,
        },
      });

      res.json({ question });
    } catch (error) {
      internalServerError(res, error, 'Failed to create repository question');
    }
  });

  router.post('/clone', async (req: Request, res: Response) => {
    const user = await requireUser(req, res, options.authService);
    if (!user) return;

    const rawIds = req.body?.questionIds;
    if (!Array.isArray(rawIds) || rawIds.length === 0) {
      badRequest(res);
      return;
    }

    const questionIds = rawIds
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0);

    if (questionIds.length === 0) {
      badRequest(res);
      return;
    }

    try {
      const questions = await options.prisma.repositoryQuestion.findMany({
        where: {
          id: { in: questionIds },
          deletedAt: null,
        },
      });

      if (questions.length === 0) {
        notFound(res);
        return;
      }

      const cloned = await options.prisma.question.createMany({
        data: questions.map((question) => ({
          authorId: user.id,
          type: 'multiple_choice',
          level: question.level,
          source: question.source,
          subjects: question.subjects,
          content:
            question.content === null
              ? Prisma.JsonNull
              : (question.content as Prisma.InputJsonValue),
        })),
      });

      res.json(cloned);
    } catch (error) {
      internalServerError(res, error, 'Failed to clone repository questions');
    }
  });

  return router;
}