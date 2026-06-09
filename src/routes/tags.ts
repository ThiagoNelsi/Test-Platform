import type { PrismaClient } from '@prisma/client';
import { Router, type Request, type Response } from 'express';
import type { AuthService } from '../auth/service';
import { requireUser } from './shared/auth';
import { badRequest, internalServerError } from './shared/responses';

export type TagsPrisma = Pick<PrismaClient, 'tag'>;

type TagsRouterOptions = {
  authService: AuthService;
  prisma: TagsPrisma;
};

export function createTagsRouter(options: TagsRouterOptions): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response) => {
    const user = await requireUser(req, res, options.authService);
    if (!user) return;

    try {
      const tags = await options.prisma.tag.findMany({
        where: {
          userId: user.id,
        },
      });

      res.json({ tags });
    } catch (error) {
      internalServerError(res, error, 'Failed to fetch tags');
    }
  });

  router.post('/', async (req: Request, res: Response) => {
    const user = await requireUser(req, res, options.authService);
    if (!user) return;

    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const color = Number(req.body?.color);

    if (!name || !Number.isInteger(color)) {
      badRequest(res, 'Missing required fields');
      return;
    }

    try {
      const existingTag = await options.prisma.tag.findFirst({
        where: {
          userId: user.id,
          name,
        },
      });

      if (existingTag) {
        badRequest(res, 'Tag já existe');
        return;
      }

      const tag = await options.prisma.tag.create({
        data: {
          userId: user.id,
          name,
          color,
        },
      });

      res.json({ success: true, tag });
    } catch (error) {
      internalServerError(res, error, 'Failed to create tag');
    }
  });

  router.get('/questions-per-tag', async (req: Request, res: Response) => {
    const user = await requireUser(req, res, options.authService);
    if (!user) return;

    try {
      const questionsPerTag = await options.prisma.tag.findMany({
        where: {
          userId: user.id,
        },
        select: {
          id: true,
          questions: {
            select: {
              id: true,
            },
          },
        },
      });

      res.json({
        questionsPerTag: questionsPerTag.map((tag) => ({
          tagId: tag.id,
          questions: tag.questions.map((question) => question.id),
        })),
      });
    } catch (error) {
      internalServerError(res, error, 'Failed to fetch questions per tag');
    }
  });

  return router;
}