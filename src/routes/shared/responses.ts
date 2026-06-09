import type { Response } from 'express';

export function unauthorized(res: Response): void {
  res.status(401).json({ error: 'Unauthorized' });
}

export function badRequest(res: Response, error: string = 'Bad Request'): void {
  res.status(400).json({ error });
}

export function notFound(res: Response, error: string = 'Not Found'): void {
  res.status(404).json({ error });
}

export function internalServerError(
  res: Response,
  error: unknown,
  fallbackMessage: string,
): void {
  const message = error instanceof Error ? error.message : fallbackMessage;
  res.status(500).json({ error: message });
}