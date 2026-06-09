import type { PrismaClient } from '@prisma/client';
import { Router, type Request, type Response } from 'express';
import type { AuthService } from '../auth/service';
import { requireUser } from './shared/auth';
import { badRequest, internalServerError, notFound } from './shared/responses';

export type ClassroomsPrisma = Pick<PrismaClient, 'classroom' | 'user'>;

type ClassroomsRouterOptions = {
  authService: AuthService;
  prisma: ClassroomsPrisma;
};

function generateClassroomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function createClassroomsRouter(options: ClassroomsRouterOptions): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response) => {
    const user = await requireUser(req, res, options.authService);
    if (!user) return;

    const include = {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    };

    try {
      const currentUser = await options.prisma.user.findUnique({
        where: { id: user.id },
        include: {
          ownedClasses: {
            include,
            orderBy: {
              createdAt: 'desc',
            },
          },
          classrooms: {
            include,
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

      if (!currentUser) {
        notFound(res, 'User not found');
        return;
      }

      res.json({
        ownedClasses: currentUser.ownedClasses,
        classrooms: currentUser.classrooms,
      });
    } catch (error) {
      internalServerError(res, error, 'Failed to fetch classrooms');
    }
  });

  router.post('/', async (req: Request, res: Response) => {
    const user = await requireUser(req, res, options.authService);
    if (!user) return;

    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';

    if (!name) {
      badRequest(res, 'Missing classroom name');
      return;
    }

    try {
      const existingClassroom = await options.prisma.classroom.findFirst({
        where: {
          ownerId: user.id,
          name,
        },
      });

      if (existingClassroom) {
        badRequest(res, 'Classroom already exists');
        return;
      }

      let code = generateClassroomCode();
      let existingCode = await options.prisma.classroom.findFirst({
        where: {
          code,
        },
      });

      while (existingCode) {
        code = generateClassroomCode();
        existingCode = await options.prisma.classroom.findFirst({
          where: {
            code,
          },
        });
      }

      const classroom = await options.prisma.classroom.create({
        data: {
          name,
          code,
          ownerId: user.id,
        },
      });

      res.json({ classroom });
    } catch (error) {
      internalServerError(res, error, 'Failed to create classroom');
    }
  });

  router.post('/join', async (req: Request, res: Response) => {
    const user = await requireUser(req, res, options.authService);
    if (!user) return;

    const code = typeof req.body?.code === 'string' ? req.body.code.trim().toUpperCase() : '';
    if (!code) {
      badRequest(res, 'Missing classroom code');
      return;
    }

    try {
      const classroom = await options.prisma.classroom.findFirst({
        where: {
          code,
        },
      });

      if (!classroom) {
        notFound(res, 'Classroom not found');
        return;
      }

      await options.prisma.classroom.update({
        where: {
          id: classroom.id,
        },
        data: {
          students: {
            connect: {
              id: user.id,
            },
          },
        },
      });

      res.json({ ok: true });
    } catch (error) {
      internalServerError(res, error, 'Failed to join classroom');
    }
  });

  return router;
}