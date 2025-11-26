export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: string,
    public howToFix?: string
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(
    message: string = 'Resource not found',
    details?: string,
    howToFix?: string
  ) {
    super(404, 'NOT_FOUND', message, details, howToFix);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string = 'Validation failed',
    details?: string,
    howToFix?: string
  ) {
    super(400, 'VALIDATION_ERROR', message, details, howToFix);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(
    message: string = 'Authentication required',
    details?: string,
    howToFix?: string
  ) {
    super(401, 'UNAUTHORIZED', message, details, howToFix);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(
    message: string = 'Access denied',
    details?: string,
    howToFix?: string
  ) {
    super(403, 'FORBIDDEN', message, details, howToFix);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends AppError {
  constructor(
    message: string = 'Resource conflict',
    details?: string,
    howToFix?: string
  ) {
    super(409, 'CONFLICT', message, details, howToFix);
    this.name = 'ConflictError';
  }
}
