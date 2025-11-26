import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: string;
    howToFix?: string;
  };
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log all errors
  logger.error('Error occurred:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  // Handle AppError instances
  if (err instanceof AppError) {
    const response: ErrorResponse = {
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        howToFix: err.howToFix,
      },
    };
    res.status(err.statusCode).json(response);
    return;
  }

  // Handle Zod validation errors
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
      },
    };
    res.status(400).json(response);
    return;
  }

  // Handle unknown errors as 500
  const response: ErrorResponse = {
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'production' ? undefined : err.message,
      howToFix: 'Please try again later. If the problem persists, contact system support.',
    },
  };
  res.status(500).json(response);
}
