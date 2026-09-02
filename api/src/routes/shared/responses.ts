import type { ApiErrorResponse } from 'api-contracts';
import type { Response } from 'express';

function errorResponse(error: string): ApiErrorResponse {
  return { error };
}

export function unauthorized(res: Response): void {
  res.status(401).json(errorResponse('Unauthorized'));
}

export function badRequest(res: Response, error: string = 'Bad Request'): void {
  res.status(400).json(errorResponse(error));
}

export function notFound(res: Response, error: string = 'Not Found'): void {
  res.status(404).json(errorResponse(error));
}

export function forbidden(res: Response, error: string = 'Forbidden'): void {
  res.status(403).json(errorResponse(error));
}

export function internalServerError(
  res: Response,
  error: unknown,
  fallbackMessage: string,
): void {
  const message = error instanceof Error ? error.message : fallbackMessage;
  res.status(500).json(errorResponse(message));
}
