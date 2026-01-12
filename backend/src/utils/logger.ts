import winston from 'winston';
import Transport from 'winston-transport';
import { getRequestContext } from './request-context';
import { redact } from './redaction';
import { logStreamManager } from './log-stream';
import type { LogEvent, LogLevel, LogModule } from '../../../shared/types/logging';

const isProduction = process.env.NODE_ENV === 'production';
const SERVICE_NAME = 'sentinel-backend';

// Map Winston levels to LogEvent levels
const LEVEL_MAP: Record<string, LogLevel> = {
  error: 'error',
  warn: 'warn',
  info: 'info',
  http: 'info', // Map http to info for LogEvent
  debug: 'debug',
};

// Custom log levels for Winston
const CUSTOM_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Register colors for custom levels BEFORE creating any formats that use colorize
winston.addColors({
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
});

/**
 * Custom transport that emits to LogStreamManager for live streaming.
 */
class LogStreamTransport extends Transport {
  constructor(opts?: Transport.TransportStreamOptions) {
    super(opts);
  }

  log(
    info: winston.Logform.TransformableInfo,
    callback: () => void
  ): void {
    setImmediate(() => {
      // Build LogEvent from Winston info
      const logEvent: LogEvent = {
        ts: new Date().toISOString(),
        level: LEVEL_MAP[info.level] || 'info',
        service: SERVICE_NAME,
        env: (process.env.NODE_ENV || 'development') as LogEvent['env'],
        msg: String(info.message),
      };

      // Add module if present
      if (info.module) {
        logEvent.module = info.module as LogModule;
      }

      // Add event name if present
      if (info.event) {
        logEvent.event = String(info.event);
      }

      // Add correlation context
      if (info.correlationId) {
        logEvent.correlationId = String(info.correlationId);
      }
      if (info.requestId) {
        logEvent.requestId = String(info.requestId);
      }
      if (info.userId) {
        logEvent.userId = String(info.userId);
      }
      if (info.socketId) {
        logEvent.socketId = String(info.socketId);
      }
      if (info.visitorId) {
        logEvent.visitorId = String(info.visitorId);
      }
      if (info.kioskId) {
        logEvent.kioskId = String(info.kioskId);
      }

      // Add HTTP context
      if (info.http) {
        logEvent.http = info.http as LogEvent['http'];
      }

      // Add WebSocket context
      if (info.ws) {
        logEvent.ws = info.ws as LogEvent['ws'];
      }

      // Add error context
      if (info.err) {
        logEvent.err = info.err as LogEvent['err'];
      }

      // Add remaining metadata (redacted)
      const excludeKeys = new Set([
        'level',
        'message',
        'timestamp',
        'module',
        'event',
        'correlationId',
        'requestId',
        'userId',
        'socketId',
        'visitorId',
        'kioskId',
        'http',
        'ws',
        'err',
        'splat', // Winston internal
      ]);

      const meta: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(info)) {
        if (!excludeKeys.has(key) && value !== undefined) {
          meta[key] = value;
        }
      }

      if (Object.keys(meta).length > 0) {
        logEvent.meta = redact(meta) as Record<string, unknown>;
      }

      // Emit to stream manager
      logStreamManager.emit(logEvent);
    });

    callback();
  }
}

// Custom format that adds correlation ID from request context
const addCorrelationId = winston.format((info) => {
  const context = getRequestContext();
  if (context) {
    info.correlationId = context.correlationId;
    info.requestId = context.requestId;
    if (context.userId) {
      info.userId = context.userId;
    }
  }
  return info;
});

// Format that applies redaction to metadata
const applyRedaction = winston.format((info) => {
  // Redact sensitive fields in the info object
  const { level, message, timestamp, ...rest } = info;

  const redacted = redact(rest) as Record<string, unknown>;

  return {
    level,
    message,
    timestamp,
    ...redacted,
  };
});

const consoleFormat = winston.format.combine(
  addCorrelationId(),
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf((info) => {
    const {
      timestamp,
      level,
      message,
      correlationId,
      userId,
      module,
      event,
      ...meta
    } = info;
    const corrId = typeof correlationId === 'string' ? correlationId : '';
    const contextStr = corrId ? ` [${corrId.slice(0, 8)}]` : '';
    const userStr = typeof userId === 'string' ? ` (user:${userId})` : '';
    const moduleStr = typeof module === 'string' ? ` [${module}]` : '';
    const eventStr = typeof event === 'string' ? ` ${event}:` : '';

    // Filter out Winston internal fields for cleaner output
    const cleanMeta = { ...meta };
    delete cleanMeta.splat;

    const metaString =
      Object.keys(cleanMeta).length > 0
        ? `\n${JSON.stringify(cleanMeta, null, 2)}`
        : '';

    return `${timestamp} [${level}]${moduleStr}${contextStr}${userStr}:${eventStr} ${message}${metaString}`;
  })
);

const productionFormat = winston.format.combine(
  addCorrelationId(),
  applyRedaction(),
  winston.format.timestamp(),
  winston.format.json()
);

// Build transports array
const transports: winston.transport[] = [
  new winston.transports.Console({
    format: isProduction ? productionFormat : consoleFormat,
  }),
];

// Add log stream transport (only emits if enabled)
transports.push(new LogStreamTransport());

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  levels: CUSTOM_LEVELS,
  transports,
});


/**
 * Create a child logger with a specific module context.
 * All logs from this logger will include the module field.
 */
export function createModuleLogger(module: LogModule): winston.Logger {
  return logger.child({ module });
}

// Pre-configured module loggers for common use cases
export const apiLogger = createModuleLogger('api');
export const wsLogger = createModuleLogger('ws');
export const authLogger = createModuleLogger('auth');
export const dbLogger = createModuleLogger('db');
export const serviceLogger = createModuleLogger('service');
export const systemLogger = createModuleLogger('system');
