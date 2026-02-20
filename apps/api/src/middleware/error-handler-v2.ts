import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '@rakuda/logger';
import { AppError, ValidationError, RateLimitError } from './api-error';

export function errorHandlerV2(err: Error, req: Request, res: Response, _next: NextFunction) {
  const requestId = (req as any).requestId || 'unknown';

  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({ path: e.path.join('.'), message: e.message }));
    logger.warn({ type: 'validation_error', requestId, path: req.path, errors: details });
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details },
      requestId,
    });
  }

  if (err instanceof RateLimitError) {
    if (err.retryAfter) res.set('Retry-After', String(err.retryAfter));
    logger.warn({ type: 'rate_limit', requestId, path: req.path });
    return res.status(429).json({
      success: false,
      error: { code: err.code, message: err.message },
      requestId,
    });
  }

  if (err instanceof AppError) {
    const level: 'warn' | 'error' = err.statusCode >= 500 ? 'error' : 'warn';
    (logger as any)[level]({
      type: 'app_error',
      requestId,
      path: req.path,
      code: (err as AppError).code,
      message: err.message,
      statusCode: (err as AppError).statusCode,
    });
    const body: Record<string, unknown> = {
      success: false,
      error: { code: (err as AppError).code || 'APP_ERROR', message: err.message },
      requestId,
    };
    if (err instanceof ValidationError && err.details) {
      (body.error as any).details = err.details;
    }
    return res.status((err as AppError).statusCode).json(body);
  }

  (logger as any).error({
    type: 'unexpected_error',
    requestId,
    path: (req as any).path,
    error: (err as any).message,
    stack: (err as any).stack,
  });
  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
    requestId,
  });
}

