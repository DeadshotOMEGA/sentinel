import type { Request, Response, NextFunction } from 'express'
import { activeConnections, recordHttpRequest } from '../lib/metrics.js'
import { apiLogger } from '../lib/logger.js'

/**
 * Metrics Middleware
 *
 * Tracks HTTP request metrics including:
 * - Request count by method, path, and status
 * - Request duration by method and path
 * - Active connection count
 */

/**
 * Normalize API paths to reduce cardinality
 *
 * Replaces UUIDs and other dynamic segments with placeholders
 * to prevent metric explosion.
 *
 * Examples:
 * - /api/members/123e4567-e89b-12d3-a456-426614174000 -> /api/members/:id
 * - /api/badges/serial/ABC123 -> /api/badges/serial/:serialNumber
 */
function normalizePath(path: string): string {
  return (
    path
      // UUID pattern
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
      // Serial numbers (alphanumeric, 4-20 chars)
      .replace(/\/serial\/[A-Z0-9]{4,20}/gi, '/serial/:serialNumber')
      // Service numbers (alphanumeric, 4-20 chars)
      .replace(/\/service\/[A-Z0-9]{4,20}/gi, '/service/:serviceNumber')
      // Numeric IDs
      .replace(/\/\d+/g, '/:id')
  )
}

/**
 * Express middleware to track request metrics
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  // Increment active connections
  activeConnections.inc()

  // Record start time
  const start = Date.now()

  // Normalize path to reduce cardinality
  const normalizedPath = normalizePath(req.path)

  // Track response finish event
  res.on('finish', () => {
    try {
      // Calculate duration in seconds
      const duration = (Date.now() - start) / 1000

      // Record metrics
      recordHttpRequest(req.method, normalizedPath, res.statusCode, duration)

      // Decrement active connections
      activeConnections.dec()

      // Log slow requests (> 1 second)
      if (duration > 1) {
        apiLogger.warn('Slow request detected', {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration: `${duration.toFixed(3)}s`,
        })
      }
    } catch (error) {
      // Don't let metrics errors crash the app
      apiLogger.error('Error recording metrics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        method: req.method,
        path: req.path,
      })
    }
  })

  // Track connection close (for aborted requests)
  res.on('close', () => {
    try {
      // Only decrement if request wasn't finished
      if (!res.writableEnded) {
        activeConnections.dec()

        apiLogger.warn('Request aborted', {
          method: req.method,
          path: req.path,
        })
      }
    } catch (error) {
      apiLogger.error('Error handling aborted request metrics', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  })

  next()
}
