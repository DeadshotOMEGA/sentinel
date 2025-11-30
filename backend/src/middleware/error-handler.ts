import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { randomUUID } from 'crypto';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: string;
    howToFix?: string;
    requestId?: string;
  };
}

/**
 * HIGH-3 FIX: Sanitize error messages to prevent information leakage
 * Never expose stack traces, SQL errors, or internal implementation details
 */
function sanitizeErrorMessage(message: string): string {
  // Patterns that indicate sensitive information leakage
  const sensitivePatterns = [
    /at\s+\S+\s+\(/i, // Stack trace lines
    /node_modules/i,
    /\.ts:\d+:\d+/i, // TypeScript file references
    /\.js:\d+:\d+/i, // JavaScript file references
    /ECONNREFUSED/i,
    /ETIMEDOUT/i,
    /column\s+"?\w+"?\s+does\s+not\s+exist/i, // PostgreSQL column errors
    /relation\s+"?\w+"?\s+does\s+not\s+exist/i, // PostgreSQL table errors
    /duplicate\s+key\s+value/i,
    /violates\s+\w+\s+constraint/i,
    /syntax\s+error\s+at\s+or\s+near/i,
    /password\s+authentication\s+failed/i,
    /connection\s+refused/i,
    /REDIS/i,
    /POSTGRES/i,
    /PG_/i,
  ];

  for (const pattern of sensitivePatterns) {
    if (pattern.test(message)) {
      return 'A system error occurred';
    }
  }

  return message;
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Generate request ID for debugging (safe to expose)
  const requestId = randomUUID();

  // Log all errors with full details (server-side only)
  logger.error('Error occurred', {
    requestId,
    name: err.name,
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  // Handle AppError instances (user-facing errors with safe messages)
  if (err instanceof AppError) {
    const response: ErrorResponse = {
      error: {
        code: err.code,
        message: err.message, // AppError messages are designed to be user-safe
        details: err.details,
        howToFix: err.howToFix,
        requestId,
      },
    };
    res.status(err.statusCode).json(response);
    return;
  }

  // Handle Zod validation errors (field-level details are safe)
  if (err instanceof ZodError) {
    const details = err.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join('; ');

    const response: ErrorResponse = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details,
        howToFix: 'Check the request payload and ensure all required fields are present and valid.',
        requestId,
      },
    };
    res.status(400).json(response);
    return;
  }

  // Handle unknown errors as 500 - NEVER expose internal details
  // Always use generic message for unknown errors to prevent information leakage
  const response: ErrorResponse = {
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      howToFix: `Please try again later. If the problem persists, contact support with reference: ${requestId}`,
      requestId,
    },
  };
  res.status(500).json(response);
}
