import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

vi.mock('@rakuda/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  AppError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  RateLimitError,
  ExternalServiceError,
} from '../../middleware/api-error';
import { errorHandlerV2 } from '../../middleware/error-handler-v2';
import { asyncHandler } from '../../middleware/async-handler';

function createMockRes() {
  const store: { statusCode?: number; body?: any; headers: Record<string, string> } = {
    headers: {},
  };
  const res = {
    status(code: number) {
      store.statusCode = code;
      return this;
    },
    json(payload: any) {
      store.body = payload;
      return this;
    },
    set(key: string, value: string) {
      store.headers[key] = value;
      return this;
    },
    get data() {
      return store;
    },
  } as unknown as Response & { data: typeof store };
  return res;
}

describe('Error classes', () => {
  it('NotFoundError sets 404 and code', () => {
    const e = new NotFoundError('User', '123');
    expect(e.statusCode).toBe(404);
    expect(e.code).toBe('NOT_FOUND');
    expect(e.message).toBe('User with id 123 not found');
    const e2 = new NotFoundError('User');
    expect(e2.message).toBe('User not found');
  });

  it('ValidationError sets 400, code and details', () => {
    const details = [{ path: 'name', message: 'Required' }];
    const e = new ValidationError('Validation failed', details);
    expect(e.statusCode).toBe(400);
    expect(e.code).toBe('VALIDATION_ERROR');
    expect(e.details).toEqual(details);
  });

  it('UnauthorizedError, ForbiddenError, ConflictError', () => {
    expect(new UnauthorizedError().statusCode).toBe(401);
    expect(new UnauthorizedError().code).toBe('UNAUTHORIZED');
    expect(new ForbiddenError().statusCode).toBe(403);
    expect(new ForbiddenError().code).toBe('FORBIDDEN');
    const conflict = new ConflictError('Already exists');
    expect(conflict.statusCode).toBe(409);
    expect(conflict.code).toBe('CONFLICT');
  });

  it('RateLimitError and ExternalServiceError properties', () => {
    const rl = new RateLimitError(60);
    expect(rl.statusCode).toBe(429);
    expect(rl.code).toBe('RATE_LIMIT');
    expect(rl.retryAfter).toBe(60);

    const original = new Error('down');
    const ext = new ExternalServiceError('payment', original);
    expect(ext.statusCode).toBe(502);
    expect(ext.code).toBe('EXTERNAL_SERVICE_ERROR');
    expect(ext.service).toBe('payment');
    expect(ext.originalError).toBe(original);
  });
});

describe('errorHandlerV2', () => {
  it('handles ZodError as validation error', () => {
    const schema = z.object({ id: z.number() });
    let zodErr: ZodError | null = null;
    try {
      schema.parse({ id: 'abc' });
    } catch (e) {
      zodErr = e as ZodError;
    }
    expect(zodErr).toBeInstanceOf(ZodError);

    const req = { path: '/zod', requestId: 'req-1' } as unknown as Request;
    const res = createMockRes();
    errorHandlerV2(zodErr as unknown as Error, req, res, (() => {}) as NextFunction);
    expect(res.data.statusCode).toBe(400);
    expect(res.data.body.success).toBe(false);
    expect(res.data.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.data.body.requestId).toBe('req-1');
    expect(Array.isArray(res.data.body.error.details)).toBe(true);
  });

  it('handles RateLimitError and sets Retry-After', () => {
    const err = new RateLimitError(120);
    const req = { path: '/rate', requestId: 'rid-2' } as unknown as Request;
    const res = createMockRes();
    errorHandlerV2(err, req, res, (() => {}) as NextFunction);
    expect(res.data.statusCode).toBe(429);
    expect(res.data.headers['Retry-After']).toBe('120');
    expect(res.data.body.error.code).toBe('RATE_LIMIT');
    expect(res.data.body.requestId).toBe('rid-2');
  });

  it('handles AppError and includes details for ValidationError', () => {
    const details = [{ path: 'email', message: 'Invalid email' }];
    const err = new ValidationError('Validation failed', details);
    const req = { path: '/val', requestId: 'rid-3' } as unknown as Request;
    const res = createMockRes();
    errorHandlerV2(err, req, res, (() => {}) as NextFunction);
    expect(res.data.statusCode).toBe(400);
    expect(res.data.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.data.body.error.details).toEqual(details);
    expect(res.data.body.requestId).toBe('rid-3');
  });

  it('handles unexpected error as 500', () => {
    const err = new Error('boom');
    const req = { path: '/err', requestId: 'rid-4' } as unknown as Request;
    const res = createMockRes();
    errorHandlerV2(err, req, res, (() => {}) as NextFunction);
    expect(res.data.statusCode).toBe(500);
    expect(res.data.body.error.code).toBe('INTERNAL_ERROR');
    expect(res.data.body.requestId).toBe('rid-4');
  });
});

describe('asyncHandler', () => {
  it('forwards rejected promise to next', async () => {
    const err = new Error('oops');
    const mw = asyncHandler(async () => {
      throw err;
    });
    const req = {} as Request;
    const res = createMockRes();
    let received: any;
    const next: NextFunction = (e?: any) => {
      received = e;
    };
    mw(req, res, next);
    await new Promise((r) => setTimeout(r, 0));
    expect(received).toBe(err);
  });

  it('does not call next on resolve', async () => {
    const mw = asyncHandler(async () => {
      return 'ok';
    });
    const req = {} as Request;
    const res = createMockRes();
    let called = false;
    const next: NextFunction = () => {
      called = true;
    };
    mw(req, res, next);
    await new Promise((r) => setTimeout(r, 0));
    expect(called).toBe(false);
  });
});

