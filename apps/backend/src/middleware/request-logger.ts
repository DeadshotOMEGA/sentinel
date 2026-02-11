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
/** Paths to skip logging for (health checks, static assets) */
const SKIP_PATHS = new Set(['/health', '/ready', '/favicon.ico'])
const SKIP_PREFIXES = ['/_next/']

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
      // Skip noisy paths
      if (SKIP_PATHS.has(req.path) || SKIP_PREFIXES.some((p) => req.path.startsWith(p))) {
        return
      }

      const duration = Date.now() - startTime

      // Include userId from auth context when available
      const reqWithUser = req as unknown as { user?: { id?: string } }
      const userId = reqWithUser.user?.id

      logRequest(req.method, req.path, res.statusCode, duration, {
        ...(userId && { userId }),
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        referer: req.headers.referer,
      })
    })

    next()
  })
}
