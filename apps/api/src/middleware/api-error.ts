export class AppError extends Error {
  constructor(public statusCode: number, public message: string, public code?: string) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(404, id ? `${resource} with id ${id} not found` : `${resource} not found`, 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public details?: Array<{ path: string; message: string }>) {
    super(400, message, 'VALIDATION_ERROR');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, message, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, 'CONFLICT');
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super(429, 'Too many requests', 'RATE_LIMIT');
    this.retryAfter = retryAfter;
  }
  retryAfter?: number;
}

export class ExternalServiceError extends AppError {
  constructor(service: string, originalError?: Error) {
    super(502, `External service ${service} failed`, 'EXTERNAL_SERVICE_ERROR');
    this.service = service;
    this.originalError = originalError;
  }
  service: string;
  originalError?: Error;
}

