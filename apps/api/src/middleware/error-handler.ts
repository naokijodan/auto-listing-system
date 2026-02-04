import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '@als/logger';

/**
 * カスタムエラークラス
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * エラーハンドラーミドルウェア
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const requestId = (req as any).requestId || 'unknown';

  // Zodバリデーションエラー
  if (err instanceof ZodError) {
    logger.warn({
      type: 'validation_error',
      requestId,
      path: req.path,
      errors: err.errors,
    });

    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: err.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      },
    });
  }

  // アプリケーションエラー
  if (err instanceof AppError) {
    logger.warn({
      type: 'app_error',
      requestId,
      path: req.path,
      code: err.code,
      message: err.message,
    });

    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code || 'APP_ERROR',
        message: err.message,
      },
    });
  }

  // 予期しないエラー
  logger.error({
    type: 'unexpected_error',
    requestId,
    path: req.path,
    error: err.message,
    stack: err.stack,
  });

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}
