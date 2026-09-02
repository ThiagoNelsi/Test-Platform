import type { PrismaClient } from '@prisma/client';
import type {
  CreateTagRequest,
  CreateTagResponse,
  QuestionsPerTagResponse,
  TagsResponse,
} from 'api-contracts';
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

      const response: TagsResponse = { tags };
      res.json(response);
    } catch (error) {
      internalServerError(res, error, 'Failed to fetch tags');
    }
  });

  router.post('/', async (req: Request, res: Response) => {
    const user = await requireUser(req, res, options.authService);
    if (!user) return;

    const body = (req.body ?? {}) as Partial<CreateTagRequest>;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const color = Number(body.color);

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

      const response: CreateTagResponse = { success: true, tag };
      res.json(response);
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

      const response: QuestionsPerTagResponse = {
        questionsPerTag: questionsPerTag.map((tag) => ({
          tagId: tag.id,
          questions: tag.questions.map((question) => question.id),
        })),
      };
      res.json(response);
    } catch (error) {
      internalServerError(res, error, 'Failed to fetch questions per tag');
    }
  });

  return router;
}
