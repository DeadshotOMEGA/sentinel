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

// Helper to detect if first param is an error code (UPPER_CASE_SNAKE) vs message
function isErrorCode(str: string): boolean {
  return /^[A-Z][A-Z0-9_]+$/.test(str);
}

export class NotFoundError extends AppError {
  constructor(
    codeOrMessage: string,
    messageOrDetails?: string,
    howToFix?: string
  ) {
    if (isErrorCode(codeOrMessage) && messageOrDetails) {
      // New format: (code, message, howToFix)
      super(404, codeOrMessage, messageOrDetails, undefined, howToFix);
    } else {
      // Old format: (message, details?, howToFix?)
      super(404, 'NOT_FOUND', codeOrMessage, messageOrDetails, howToFix);
    }
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AppError {
  constructor(
    codeOrMessage: string,
    messageOrDetails?: string,
    howToFix?: string
  ) {
    if (isErrorCode(codeOrMessage) && messageOrDetails) {
      // New format: (code, message, howToFix)
      super(400, codeOrMessage, messageOrDetails, undefined, howToFix);
    } else {
      // Old format: (message, details?, howToFix?)
      super(400, 'VALIDATION_ERROR', codeOrMessage, messageOrDetails, howToFix);
    }
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
    codeOrMessage: string,
    messageOrDetails?: string,
    howToFix?: string
  ) {
    if (isErrorCode(codeOrMessage) && messageOrDetails) {
      // New format: (code, message, howToFix)
      super(409, codeOrMessage, messageOrDetails, undefined, howToFix);
    } else {
      // Old format: (message, details?, howToFix?)
      super(409, 'CONFLICT', codeOrMessage, messageOrDetails, howToFix);
    }
    this.name = 'ConflictError';
  }
}
