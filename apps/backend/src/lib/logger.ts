import winston from 'winston'
import { AsyncLocalStorage } from 'async_hooks'

/**
 * Request context storage for correlation IDs
 *
 * This allows us to track requests across async operations
 * and log correlation IDs automatically.
 */
export const requestContext = new AsyncLocalStorage<{
  correlationId: string
  userId?: string
  apiKeyId?: string
}>()

/**
 * Get current correlation ID from async context
 */
export function getCorrelationId(): string | undefined {
  return requestContext.getStore()?.correlationId
}

/**
 * Get current user ID from async context
 */
export function getUserId(): string | undefined {
  return requestContext.getStore()?.userId
}

/**
 * Custom format to include correlation ID from async context
 */
const correlationIdFormat = winston.format((info) => {
  const store = requestContext.getStore()
  if (store) {
    info.correlationId = store.correlationId
    if (store.userId) {
      info.userId = store.userId
    }
    if (store.apiKeyId) {
      info.apiKeyId = store.apiKeyId
    }
  }
  return info
})

/**
 * Base Winston logger instance
 *
 * Features:
 * - Structured JSON logging
 * - Correlation ID tracking via AsyncLocalStorage
 * - Environment-based log levels
 * - Error stack traces
 * - Timestamp in ISO format
 */
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    winston.format.errors({ stack: true }),
    correlationIdFormat(),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'sentinel-backend',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [
    new winston.transports.Console({
      format:
        process.env.NODE_ENV === 'development'
          ? winston.format.combine(
              winston.format.colorize(),
              winston.format.printf(
                ({ timestamp, level, message, module, correlationId, userId, ...meta }) => {
                  const moduleStr = module ? `[${module}]` : ''
                  const corrIdStr =
                    correlationId && typeof correlationId === 'string'
                      ? `[${correlationId.slice(0, 8)}]`
                      : ''
                  const userIdStr =
                    userId && typeof userId === 'string' ? `[user:${userId.slice(0, 8)}]` : ''
                  const metaStr =
                    Object.keys(meta).length > 0 ? `\n${JSON.stringify(meta, null, 2)}` : ''
                  return `${timestamp} ${level} ${moduleStr}${corrIdStr}${userIdStr}: ${message}${metaStr}`
                }
              )
            )
          : winston.format.json(),
    }),
  ],
})

/**
 * Module-specific loggers
 *
 * Usage:
 *   apiLogger.info('Request received', { method: 'GET', path: '/api/members' })
 *   dbLogger.error('Query failed', { error: err.message })
 */
export const apiLogger = logger.child({ module: 'api' })
export const dbLogger = logger.child({ module: 'db' })
export const authLogger = logger.child({ module: 'auth' })
export const wsLogger = logger.child({ module: 'websocket' })
export const serviceLogger = logger.child({ module: 'service' })

/**
 * Log HTTP request with correlation ID
 */
export function logRequest(
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  metadata: Record<string, unknown> = {}
) {
  apiLogger.info('HTTP Request', {
    method,
    path,
    statusCode,
    duration,
    ...metadata,
  })
}

/**
 * Log database query
 */
export function logQuery(query: string, duration: number, metadata: Record<string, unknown> = {}) {
  dbLogger.debug('Database Query', {
    query,
    duration,
    ...metadata,
  })
}

/**
 * Log authentication event
 */
export function logAuthEvent(
  event: string,
  userId?: string,
  metadata: Record<string, unknown> = {}
) {
  authLogger.info('Auth Event', {
    event,
    userId,
    ...metadata,
  })
}

/**
 * Log WebSocket event
 */
export function logWsEvent(
  event: string,
  socketId: string,
  metadata: Record<string, unknown> = {}
) {
  wsLogger.info('WebSocket Event', {
    event,
    socketId,
    ...metadata,
  })
}

/**
 * Log application startup
 */
export function logStartup(port: number, environment: string) {
  logger.info('Application started', {
    port,
    environment,
    nodeVersion: process.version,
    platform: process.platform,
  })
}

/**
 * Log application shutdown
 */
export function logShutdown(signal: string) {
  logger.info('Application shutting down', { signal })
}

/**
 * Log unhandled errors
 */
export function logUnhandledError(error: Error, type: 'uncaughtException' | 'unhandledRejection') {
  logger.error('Unhandled error', {
    type,
    error: error.message,
    stack: error.stack,
  })
}
