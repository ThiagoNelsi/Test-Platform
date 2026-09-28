import { GetObjectCommand, type S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { PrismaClient, ResourceStatus } from '@prisma/client';
import { Router, type Request, type Response } from 'express';
import type { ResourcesResponse, ResourceFileResponse, ResourceResponse } from 'api-contracts';
import type { AuthService } from '../auth/service';
import { requireUser } from './shared/auth';
import { badRequest, internalServerError, notFound } from './shared/responses';
import { toResourceDto } from './shared/serializers';

export type ResourcePrisma = Pick<PrismaClient, 'resource'>;

type ResourceRouterOptions = {
  authService: AuthService;
  prisma: ResourcePrisma;
  bucketName?: string;
  s3Client?: S3Client;
  presignFile?: typeof getSignedUrl;
};

const statuses: ResourceStatus[] = ['PENDING_UPLOAD', 'UPLOADED', 'PROCESSING', 'PROCESSED', 'FAILED', 'EXPIRED'];

export function createResourceRouter(options: ResourceRouterOptions): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response) => {
    const user = await requireUser(req, res, options.authService);
    if (!user) return;
    const status = req.query.status as ResourceStatus | undefined;
    if ((status !== undefined && !statuses.includes(status)) ||
      (req.query.deleted !== undefined && req.query.deleted !== 'true' && req.query.deleted !== 'false')) {
      badRequest(res, 'Filtro de materiais inválido.');
      return;
    }
    try {
      const resources = await options.prisma.resource.findMany({
        where: {
          ownerId: user.id,
          deletedAt: req.query.deleted === 'true' ? { not: null } : null,
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

  // Scope every lookup and mutation to the owner and the expected trash state.
  router.use('/:id', async (req, res, next) => {
    const user = await requireUser(req, res, options.authService);
    if (!user) return;
    if (!/^\d+$/.test(String(req.params.id)) || !Number.isSafeInteger(Number(req.params.id)) || Number(req.params.id) <= 0) {
      badRequest(res, 'Material inválido.');
      return;
    }
    res.locals.ownerId = user.id;
    next();
  });

  router.patch('/:id', async (req, res) => {
    const { filename, tags } = req.body ?? {};
    if (typeof filename !== 'string' || !filename.trim() || filename.trim().length > 255 ||
      /[\\/\u0000-\u001f\u007f]/.test(filename) || !Array.isArray(tags) || tags.length > 30 ||
      !tags.every((tag) => typeof tag === 'string' && tag.trim().length > 0 && tag.trim().length <= 50)) {
      badRequest(res, 'Informe um nome válido e até 30 tags de no máximo 50 caracteres.');
      return;
    }
    try {
      const resource = await options.prisma.resource.updateMany({
        where: { id: Number(req.params.id), ownerId: res.locals.ownerId, deletedAt: null },
        data: { filename: filename.trim(), tags: [...new Set(tags.map((tag: string) => tag.trim()))] },
      });
      if (!resource.count) { notFound(res, 'Material não encontrado.'); return; }
      const updated = await options.prisma.resource.findFirst({
        where: { id: Number(req.params.id), ownerId: res.locals.ownerId, deletedAt: null },
      });
      if (!updated) { notFound(res, 'Material não encontrado.'); return; }
      res.json({ resource: toResourceDto(updated) } satisfies ResourceResponse);
    } catch (error) {
      internalServerError(res, error, 'Não foi possível atualizar o material.');
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      const result = await options.prisma.resource.updateMany({
        where: { id: Number(req.params.id), ownerId: res.locals.ownerId, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      if (!result.count) { notFound(res, 'Material não encontrado.'); return; }
      res.json({ ok: true });
    } catch (error) {
      internalServerError(res, error, 'Não foi possível excluir o material.');
    }
  });

  router.post('/:id/restore', async (req, res) => {
    try {
      const result = await options.prisma.resource.updateMany({
        where: { id: Number(req.params.id), ownerId: res.locals.ownerId, deletedAt: { not: null } },
        data: { deletedAt: null },
      });
      if (!result.count) { notFound(res, 'Material não encontrado na lixeira.'); return; }
      res.json({ ok: true });
    } catch (error) {
      internalServerError(res, error, 'Não foi possível restaurar o material.');
    }
  });

  router.get('/:id/file', async (req, res) => {
    if (req.query.download !== undefined && req.query.download !== 'true' && req.query.download !== 'false') {
      badRequest(res, 'Opção de download inválida.'); return;
    }
    try {
      const resource = await options.prisma.resource.findFirst({
        where: { id: Number(req.params.id), ownerId: res.locals.ownerId, deletedAt: null },
      });
      if (!resource) { notFound(res, 'Material não encontrado.'); return; }
      if (resource.status === 'PENDING_UPLOAD' || resource.status === 'EXPIRED') {
        badRequest(res, 'O arquivo ainda não está disponível.'); return;
      }
      if (!options.s3Client || !options.bucketName) throw new Error('File storage not configured');
      const download = req.query.download === 'true';
      // Only render passive document/image formats inline; other files are attachments.
      const inline = !download && ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'text/plain'].includes(resource.fileType);
      const filename = resource.filename.replace(/[\u0000-\u001f\u007f"\\]/g, '_');
      const asciiName = filename.replace(/[^\x20-\x7e]/g, '_');
      const encodedName = encodeURIComponent(filename).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
      const expiresSeconds = 300;
      const url = await (options.presignFile ?? getSignedUrl)(options.s3Client, new GetObjectCommand({
        Bucket: options.bucketName,
        Key: resource.objectKey,
        ResponseContentType: inline ? resource.fileType : 'application/octet-stream',
        ResponseContentDisposition: `${inline ? 'inline' : 'attachment'}; filename="${asciiName}"; filename*=UTF-8''${encodedName}`,
      }), { expiresIn: expiresSeconds });
      res.set('Cache-Control', 'no-store');
      res.json({ url, expiresAt: new Date(Date.now() + expiresSeconds * 1000).toISOString() } satisfies ResourceFileResponse);
    } catch (error) {
      internalServerError(res, error, 'Não foi possível acessar o arquivo.');
    }
  });

  return router;
}
