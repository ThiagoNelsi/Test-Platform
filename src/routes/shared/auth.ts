import type { Request, Response } from 'express';
import type { AuthService, BackendUser } from '../../auth/service';
import { unauthorized } from './responses';

export async function requireUser(
  req: Request,
  res: Response,
  authService: AuthService,
): Promise<BackendUser | null> {
  const token = req.cookies?.session as string | undefined;

  if (!token) {
    unauthorized(res);
    return null;
  }

  const user = await authService.getCurrentUser(token);

  if (!user) {
    unauthorized(res);
    return null;
  }

  return user;
}