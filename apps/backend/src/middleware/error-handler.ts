import { Request, Response, NextFunction } from 'express'
import { logger, getCorrelationId } from '../lib/logger.js'
import { Prisma } from '@sentinel/database'

/**
 * Application error class for custom errors
 */
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'AppError'
  }
}

/**
 * Validation error class for input validation failures
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 400, 'VALIDATION_ERROR', details)
    this.name = 'ValidationError'
  }
}

/**
 * Not found error class
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`
    super(message, 404, 'NOT_FOUND')
    this.name = 'NotFoundError'
  }
}

/**
 * Conflict error class for duplicate resources
 */
export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 409, 'CONFLICT', details)
    this.name = 'ConflictError'
  }
}

/**
 * Handle Prisma errors and convert to appropriate HTTP responses
 */
function handlePrismaError(error: Error): AppError {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002': {
        // Unique constraint violation
        const field = (error.meta?.target as string[])?.join(', ') || 'field'
        return new ConflictError(`Duplicate value for ${field}`, {
          field,
          code: error.code,
        })
      }

      case 'P2003': {
        // Foreign key constraint violation
        const field = error.meta?.field_name as string
        return new ValidationError(`Invalid reference for ${field || 'foreign key'}`, {
          field,
          code: error.code,
        })
      }

      case 'P2025': {
        // Record not found
        return new NotFoundError('Record')
      }

      case 'P2014': {
        // Invalid relation
        return new ValidationError('Invalid relation between records', {
          code: error.code,
        })
      }

      default: {
        logger.error('Unhandled Prisma error', {
          code: error.code,
          message: error.message,
          meta: error.meta,
        })
        return new AppError('Database operation failed', 500, 'DATABASE_ERROR')
      }
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return new ValidationError('Invalid data provided to database', {
      message: error.message,
    })
  }

  // Unknown Prisma error
  logger.error('Unknown Prisma error', {
    name: error.name,
    message: error.message,
  })
  return new AppError('Database error occurred', 500, 'DATABASE_ERROR')
}

/**
 * Error handler middleware
 *
 * Catches all errors thrown in routes and middleware, converts them to
 * appropriate HTTP responses, and logs them.
 *
 * MUST be the last middleware in the stack.
 */
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  // If response already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err)
  }

  const correlationId = getCorrelationId()

  // Handle different error types
  let appError: AppError

  if (err instanceof AppError) {
    appError = err
  } else if (
    err instanceof Prisma.PrismaClientKnownRequestError ||
    err instanceof Prisma.PrismaClientValidationError
  ) {
    appError = handlePrismaError(err)
  } else {
    // Unknown error
    appError = new AppError(
      process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
      500,
      'INTERNAL_ERROR'
    )
  }

  // Log error
  if (appError.statusCode >= 500) {
    logger.error('Server error', {
      error: err.message,
      stack: err.stack,
      statusCode: appError.statusCode,
      code: appError.code,
      path: req.path,
      method: req.method,
    })
  } else {
    logger.warn('Client error', {
      error: err.message,
      statusCode: appError.statusCode,
      code: appError.code,
      path: req.path,
      method: req.method,
    })
  }

  // Send error response
  res.status(appError.statusCode).json({
    error: appError.code,
    message: appError.message,
    ...(appError.details && { details: appError.details }),
    ...(correlationId && { correlationId }),
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
    }),
  })
}

/**
 * 404 handler for undefined routes
 *
 * Should be added after all route handlers but before the error handler.
 */
export function notFoundHandler(req: Request, res: Response) {
  const correlationId = getCorrelationId()

  logger.warn('Route not found', {
    path: req.path,
    method: req.method,
  })

  res.status(404).json({
    error: 'NOT_FOUND',
    message: `Cannot ${req.method} ${req.path}`,
    ...(correlationId && { correlationId }),
  })
}
