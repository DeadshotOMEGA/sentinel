import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import { AsyncLocalStorage } from 'async_hooks'
import { performance } from 'node:perf_hooks'
import { v4 as uuidv4 } from 'uuid'
import { socketIOTransport } from './log-transport-socketio.js'

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
 * Assign a unique ID to each log entry for deduplication
 */
const logIdFormat = winston.format((info) => {
  info.id = uuidv4()
  return info
})

/**
 * Sensitive data redaction format.
 * Redacts values for keys matching password, secret, token, apiKey, authorization, cookie.
 */
const SENSITIVE_KEYS = /^(password|secret|token|apikey|authorization|cookie)$/i

function redactValue(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'string') return obj
  if (Array.isArray(obj)) return obj.map(redactValue)
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.test(key)) {
        result[key] = '[REDACTED]'
      } else if (typeof value === 'object' && value !== null) {
        result[key] = redactValue(value)
      } else {
        result[key] = value
      }
    }
    return result
  }
  return obj
}

const redactionFormat = winston.format((info) => {
  for (const key of Object.keys(info)) {
    if (SENSITIVE_KEYS.test(key)) {
      info[key] = '[REDACTED]'
    } else if (typeof info[key] === 'object' && info[key] !== null) {
      info[key] = redactValue(info[key])
    }
  }
  return info
})

const isDev = process.env.NODE_ENV !== 'production'

/**
 * File transports for production-grade logging
 */
const fileTransports: winston.transport[] = [
  new DailyRotateFile({
    filename: 'logs/combined-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    level: 'info',
  }),
  new DailyRotateFile({
    filename: 'logs/error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d',
    level: 'error',
  }),
]

/**
 * Base Winston logger instance
 *
 * Features:
 * - Structured JSON logging
 * - Correlation ID tracking via AsyncLocalStorage
 * - Environment-based log levels
 * - Error stack traces
 * - Timestamp in ISO format
 * - Daily rotating file transports
 * - Socket.IO real-time streaming transport
 * - Sensitive data redaction
 * - Unique entry IDs for deduplication
 */
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    winston.format.errors({ stack: true }),
    logIdFormat(),
    correlationIdFormat(),
    redactionFormat(),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'sentinel-backend',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [
    new winston.transports.Console({
      format: isDev
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
    socketIOTransport,
    ...fileTransports,
  ],
  exceptionHandlers: [new winston.transports.File({ filename: 'logs/exceptions.log' })],
  rejectionHandlers: [new winston.transports.File({ filename: 'logs/rejections.log' })],
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
export const jobLogger = logger.child({ module: 'job' })
export const importLogger = logger.child({ module: 'import' })

/**
 * Create a timer for profiling operations.
 * Returns an object with a `done()` method that logs the elapsed time.
 */
export function createTimer(label: string, moduleLogger: winston.Logger = logger) {
  const start = performance.now()
  return {
    done(metadata?: Record<string, unknown>) {
      const elapsed = Math.round(performance.now() - start)
      moduleLogger.info(`${label} completed`, { duration: elapsed, ...metadata })
    },
  }
}

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
  // Determine log level based on status code
  const level =
    statusCode >= 500
      ? 'error'
      : statusCode >= 400 && statusCode !== 401 && statusCode !== 404
        ? 'warn'
        : statusCode >= 400
          ? 'info'
          : 'http'

  apiLogger.log(level, `${method} ${path} ${statusCode} ${duration}ms`, {
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
