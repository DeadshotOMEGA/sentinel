import { Request, Response, NextFunction } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { requestContext, logRequest } from '../lib/logger.js'

/**
 * Request logging middleware
 *
 * Features:
 * - Generates correlation ID for each request
 * - Stores correlation ID in AsyncLocalStorage for access in nested functions
 * - Logs request completion with method, path, status code, and duration
 * - Adds correlation ID to response headers
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  // Generate or extract correlation ID
  const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4()

  // Store in async context for access throughout request lifecycle
  requestContext.run({ correlationId }, () => {
    // Add correlation ID to response headers
    res.setHeader('x-correlation-id', correlationId)

    // Track request timing
    const startTime = Date.now()

    // Log when response is finished
    res.on('finish', () => {
      const duration = Date.now() - startTime

      logRequest(req.method, req.path, res.statusCode, duration, {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        referer: req.headers.referer,
      })
    })

    next()
  })
}
