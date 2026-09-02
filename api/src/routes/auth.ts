import { Router, type Request, type Response } from 'express';
import type { AuthMeResponse, LogoutResponse } from 'api-contracts';
import type { AuthService } from '../auth/service';

export function createAuthRouter(authService: AuthService): Router {
  const router = Router();

  router.get('/google/start', (_req: Request, res: Response) => {
    res.redirect(authService.startGoogleAuth());
  });

  router.get('/google/callback', async (req: Request, res: Response): Promise<void> => {
    try {
      const code = String(req.query.code || '');

      if (!code) {
        res.status(400).send('Missing code');
        return;
      }

      const result = await authService.handleGoogleCallback(code);
      res.cookie('session', result.sessionToken, authService.buildSessionCookieOptions());
      res.redirect(result.redirectTo);
    } catch (error) {
      console.error('OAuth callback error', error);
      res.status(500).send('Authentication error');
    }
  });

  router.get('/me', async (req: Request, res: Response): Promise<void> => {
    const token = req.cookies?.session as string | undefined;
    const user = await authService.getCurrentUser(token);

    const response: AuthMeResponse = { user };
    res.json(response);
  });

  router.post('/logout', (_req: Request, res: Response) => {
    res.clearCookie('session', authService.buildLogoutCookieOptions());
    const response: LogoutResponse = { ok: true };
    res.json(response);
  });

  return router;
}
