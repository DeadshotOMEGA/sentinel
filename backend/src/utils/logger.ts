import winston from 'winston';
import { getRequestContext } from './request-context';

const isProduction = process.env.NODE_ENV === 'production';

// Custom format that adds correlation ID from request context
const addCorrelationId = winston.format((info) => {
  const context = getRequestContext();
  if (context) {
    info.correlationId = context.correlationId;
    if (context.userId) {
      info.userId = context.userId;
    }
  }
  return info;
});

const consoleFormat = winston.format.combine(
  addCorrelationId(),
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf((info) => {
    const { timestamp, level, message, correlationId, userId, ...meta } = info;
    const corrId = typeof correlationId === 'string' ? correlationId : '';
    const contextStr = corrId ? ` [${corrId.slice(0, 8)}]` : '';
    const userStr = typeof userId === 'string' ? ` (user:${userId})` : '';
    const metaString = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${timestamp} [${level}]${contextStr}${userStr}: ${message}${metaString}`;
  })
);

const productionFormat = winston.format.combine(
  addCorrelationId(),
  winston.format.timestamp(),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
  },
  transports: [
    new winston.transports.Console({
      format: isProduction ? productionFormat : consoleFormat,
    }),
  ],
});

// Add colors for custom levels
winston.addColors({
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
});
