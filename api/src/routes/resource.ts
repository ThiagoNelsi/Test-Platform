import type { PrismaClient, ResourceStatus } from '@prisma/client';
import { Router, type Request, type Response } from 'express';
import type { ResourcesResponse } from 'api-contracts';
import type { AuthService } from '../auth/service';
import { requireUser } from './shared/auth';
import { internalServerError } from './shared/responses';
import { toResourceDto } from './shared/serializers';

export type ResourcePrisma = Pick<PrismaClient, 'resource'>;

type ResourceRouterOptions = {
  authService: AuthService;
  prisma: ResourcePrisma;
};

export function createResourceRouter(options: ResourceRouterOptions): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response) => {
    const user = await requireUser(req, res, options.authService);
    if (!user) return;

    const status = req.query.status as ResourceStatus | undefined;

    try {
      const resources = await options.prisma.resource.findMany({
        where: {
          ownerId: user.id,
          deletedAt: null,
          ...(status ? { status } : {}),
        },
        orderBy: { createdAt: 'desc' },
      });

      const response: ResourcesResponse = { resources: resources.map(toResourceDto) };
      res.json(response);
    } catch (error) {
      internalServerError(res, error, 'Failed to fetch resources');
    }
  });

  return router;
}
