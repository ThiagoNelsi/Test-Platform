import { Prisma, type PrismaClient } from '@prisma/client';
import { Router, type Request, type Response } from 'express';
import type { AuthService } from '../auth/service';
import { requireUser } from './shared/auth';
import { badRequest, internalServerError, notFound } from './shared/responses';

type DataParam = {
  name?: string;
  value?: number;
  dueDate?: string | Date | null;
  duration?: number | null;
  description?: string | null;
  publishDate?: string | Date | null;
  status?: string;
  classroomIds?: number[];
  sections: {
    selectionMode: string;
    shuffle?: boolean;
    questions: {
      id: number;
      version?: number;
    }[];
    randomQuestionCount?: number;
  }[];
};

export type TestsPrisma = Pick<PrismaClient, 'test' | 'question' | 'classroom' | '$transaction'>;

type TestsRouterOptions = {
  authService: AuthService;
  prisma: TestsPrisma;
};

function normalizeStatus(status?: string, publishDate?: string | Date | null): string | undefined {
  if (status === 'published' && publishDate) {
    return 'scheduled';
  }
  return status;
}

async function getCurrentQuestionVersions(
  prisma: TestsPrisma,
  sections: DataParam['sections'],
): Promise<Map<number, number>> {
  const questionIds = sections.flatMap((section) => section.questions.map((question) => question.id));

  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    select: { id: true, version: true },
  });

  const questionMap = new Map<number, number>();
  questions.forEach((question) => questionMap.set(question.id, question.version));

  return questionMap;
}

function buildSections(
  sections: DataParam['sections'],
  questionMap: Map<number, number>,
): Prisma.InputJsonValue {
  return sections.map((section) => {
    if (section.selectionMode === 'random') {
      return {
        count: section.randomQuestionCount,
        questions: section.questions.map((question) => ({
          questionId: question.id,
          version: questionMap.get(question.id),
        })),
      };
    }

    return {
      shuffle: section.shuffle,
      questions: section.questions.map((question) => ({
        questionId: question.id,
        version: questionMap.get(question.id),
      })),
    };
  }) as Prisma.InputJsonValue;
}

async function getOwnedClassroomIds(prisma: TestsPrisma, ownerId: number, classroomIds: number[]): Promise<number[]> {
  const parsedIds = classroomIds
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);

  if (parsedIds.length === 0) {
    return [];
  }

  const classrooms = await prisma.classroom.findMany({
    where: {
      id: { in: parsedIds },
      ownerId,
    },
    select: { id: true },
  });

  const validIds = new Set(classrooms.map((classroom) => classroom.id));
  return parsedIds.filter((id) => validIds.has(id));
}

export function createTestsRouter(options: TestsRouterOptions): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response) => {
    const user = await requireUser(req, res, options.authService);
    if (!user) return;

    try {
      const tests = await options.prisma.test.findMany({
        where: {
          authorId: user.id,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          description: true,
          value: true,
          dueDate: true,
          publishDate: true,
          status: true,
          createdAt: true,
          modifiedAt: true,
          classroom: {
            select: {
              id: true,
              name: true,
              _count: {
                select: {
                  students: true,
                },
              },
            },
          },
          _count: {
            select: {
              submissions: {
                where: {
                  finishTime: { not: null },
                },
              },
            },
          },
        },
        orderBy: {
          modifiedAt: 'desc',
        },
      });

      res.json({ tests });
    } catch (error) {
      internalServerError(res, error, 'Failed to fetch tests');
    }
  });

  router.get('/:id', async (req: Request, res: Response) => {
    const user = await requireUser(req, res, options.authService);
    if (!user) return;

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      badRequest(res, 'Invalid test id');
      return;
    }

    try {
      const test = await options.prisma.test.findFirst({
        where: {
          id,
          authorId: user.id,
          deletedAt: null,
        },
      });

      if (!test) {
        notFound(res, 'Test not found');
        return;
      }

      res.json({ test });
    } catch (error) {
      internalServerError(res, error, 'Failed to fetch test');
    }
  });

  router.post('/', async (req: Request, res: Response) => {
    const user = await requireUser(req, res, options.authService);
    if (!user) return;

    const data = (req.body ?? {}) as DataParam;
    if (!Array.isArray(data.sections)) {
      badRequest(res, 'Missing sections');
      return;
    }

    try {
      const questionMap = await getCurrentQuestionVersions(options.prisma, data.sections);
      const status = normalizeStatus(data.status, data.publishDate);
      const sections = buildSections(data.sections, questionMap);
      const classroomIds = Array.isArray(data.classroomIds) ? data.classroomIds : [];

      if (status === 'draft' || classroomIds.length === 0) {
        const test = await options.prisma.test.create({
          data: {
            authorId: user.id,
            name: data.name,
            value: data.value,
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
            timer: data.duration,
            description: data.description,
            publishDate: data.publishDate ? new Date(data.publishDate) : null,
            status,
            sections,
          },
        });

        res.json({ test });
        return;
      }

      const validClassrooms = await getOwnedClassroomIds(options.prisma, user.id, classroomIds);
      if (validClassrooms.length === 0) {
        badRequest(res, 'No valid classrooms');
        return;
      }

      const tests = await options.prisma.$transaction(async (tx) => {
        return Promise.all(
          validClassrooms.map((classroomId) =>
            tx.test.create({
              data: {
                authorId: user.id,
                name: data.name,
                value: data.value,
                dueDate: data.dueDate ? new Date(data.dueDate) : null,
                timer: data.duration,
                description: data.description,
                publishDate: data.publishDate ? new Date(data.publishDate) : null,
                status,
                sections,
                classroomId,
              },
            }),
          ),
        );
      });

      res.json({ tests });
    } catch (error) {
      internalServerError(res, error, 'Failed to create test');
    }
  });

  router.patch('/:id', async (req: Request, res: Response) => {
    const user = await requireUser(req, res, options.authService);
    if (!user) return;

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      badRequest(res, 'Invalid test id');
      return;
    }

    const data = (req.body ?? {}) as DataParam;
    if (!Array.isArray(data.sections)) {
      badRequest(res, 'Missing sections');
      return;
    }

    try {
      const existing = await options.prisma.test.findFirst({
        where: {
          id,
          authorId: user.id,
        },
      });

      if (!existing) {
        notFound(res, 'Test not found');
        return;
      }

      const questionMap = await getCurrentQuestionVersions(options.prisma, data.sections);
      const status = normalizeStatus(data.status, data.publishDate);

      const test = await options.prisma.test.update({
        where: { id },
        data: {
          name: data.name,
          value: data.value,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          timer: data.duration,
          description: data.description,
          publishDate: data.publishDate ? new Date(data.publishDate) : null,
          status,
          modifiedAt: new Date(),
          sections: buildSections(data.sections, questionMap),
        },
      });

      res.json({ test });
    } catch (error) {
      internalServerError(res, error, 'Failed to update test');
    }
  });

  router.post('/:id/publish', async (req: Request, res: Response) => {
    const user = await requireUser(req, res, options.authService);
    if (!user) return;

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      badRequest(res, 'Invalid test id');
      return;
    }

    const classroomIds = Array.isArray(req.body?.classroomIds) ? req.body.classroomIds : [];

    try {
      const test = await options.prisma.test.findFirst({
        where: {
          id,
          authorId: user.id,
        },
      });

      if (!test) {
        notFound(res, 'Test not found');
        return;
      }

      if (classroomIds.length === 0) {
        const publishedTest = await options.prisma.test.update({
          where: { id },
          data: {
            status: 'published',
            classroomId: null,
          },
        });

        res.json({ tests: [publishedTest] });
        return;
      }

      const validClassrooms = await getOwnedClassroomIds(options.prisma, user.id, classroomIds);
      if (validClassrooms.length === 0) {
        badRequest(res, 'No valid classrooms');
        return;
      }

      const [firstClassroom, ...otherClassrooms] = validClassrooms;

      const publishedTests = await options.prisma.$transaction(async (tx) => {
        const updated = await tx.test.update({
          where: { id },
          data: {
            status: 'published',
            classroomId: firstClassroom,
          },
        });

        const clones = await Promise.all(
          otherClassrooms.map((classroomId) =>
            tx.test.create({
              data: {
                authorId: test.authorId,
                name: test.name,
                value: test.value,
                dueDate: test.dueDate,
                timer: test.timer,
                description: test.description,
                publishDate: test.publishDate,
                status: 'published',
                sections:
                  test.sections === null ? Prisma.JsonNull : (test.sections as Prisma.InputJsonValue),
                classroomId,
              },
            }),
          ),
        );

        return [updated, ...clones];
      });

      res.json({ tests: publishedTests });
    } catch (error) {
      internalServerError(res, error, 'Failed to publish test');
    }
  });

  router.post('/:id/schedule', async (req: Request, res: Response) => {
    const user = await requireUser(req, res, options.authService);
    if (!user) return;

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      badRequest(res, 'Invalid test id');
      return;
    }

    const classroomIds = Array.isArray(req.body?.classroomIds) ? req.body.classroomIds : [];
    if (classroomIds.length === 0) {
      badRequest(res, 'Missing classroomIds');
      return;
    }

    try {
      const test = await options.prisma.test.findFirst({
        where: {
          id,
          authorId: user.id,
        },
      });

      if (!test) {
        notFound(res, 'Test not found');
        return;
      }

      const validClassrooms = await getOwnedClassroomIds(options.prisma, user.id, classroomIds);
      if (validClassrooms.length === 0) {
        badRequest(res, 'No valid classrooms');
        return;
      }

      const [firstClassroom, ...otherClassrooms] = validClassrooms;

      const scheduledTests = await options.prisma.$transaction(async (tx) => {
        const updated = await tx.test.update({
          where: { id },
          data: {
            status: 'scheduled',
            classroomId: firstClassroom,
          },
        });

        const clones = await Promise.all(
          otherClassrooms.map((classroomId) =>
            tx.test.create({
              data: {
                authorId: test.authorId,
                name: test.name,
                value: test.value,
                dueDate: test.dueDate,
                timer: test.timer,
                description: test.description,
                publishDate: test.publishDate,
                status: 'scheduled',
                sections:
                  test.sections === null ? Prisma.JsonNull : (test.sections as Prisma.InputJsonValue),
                classroomId,
              },
            }),
          ),
        );

        return [updated, ...clones];
      });

      res.json({ tests: scheduledTests });
    } catch (error) {
      internalServerError(res, error, 'Failed to schedule test');
    }
  });

  router.delete('/:id', async (req: Request, res: Response) => {
    const user = await requireUser(req, res, options.authService);
    if (!user) return;

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      badRequest(res, 'Invalid test id');
      return;
    }

    const softDelete = req.query.softDelete !== 'false';

    try {
      const test = await options.prisma.test.findFirst({
        where: {
          id,
          authorId: user.id,
        },
      });

      if (!test) {
        notFound(res, 'Test not found');
        return;
      }

      if (softDelete) {
        const deletedTest = await options.prisma.test.update({
          where: { id },
          data: { deletedAt: new Date() },
        });
        res.json({ test: deletedTest, deleted: 'soft' });
        return;
      }

      await options.prisma.test.delete({
        where: { id },
      });

      res.json({ ok: true, deleted: 'hard' });
    } catch (error) {
      internalServerError(res, error, 'Failed to delete test');
    }
  });

  return router;
}