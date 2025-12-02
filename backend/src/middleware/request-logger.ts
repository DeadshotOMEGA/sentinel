import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { createRequestContext, runWithContext, getRequestContext } from '../utils/request-context';
import { recordRequest } from '../utils/metrics';

const CORRELATION_ID_HEADER = 'x-correlation-id';
const REQUEST_ID_HEADER = 'x-request-id';

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Create request context with correlation ID (from header or generated)
  const incomingCorrelationId = req.headers[CORRELATION_ID_HEADER];
  const correlationId = typeof incomingCorrelationId === 'string'
    ? incomingCorrelationId
    : undefined;

  const context = createRequestContext({
    correlationId,
    path: req.path,
    method: req.method,
  });

  // Set response headers for tracing
  res.setHeader(CORRELATION_ID_HEADER, context.correlationId);
  res.setHeader(REQUEST_ID_HEADER, context.requestId);

  // Run the rest of the request within this context
  runWithContext(context, () => {
    // Log request when response finishes
    res.on('finish', () => {
      const requestContext = getRequestContext();
      const duration = requestContext
        ? Date.now() - requestContext.startTime
        : 0;
      const { method, url } = req;
      const { statusCode } = res;

      // Record metrics
      recordRequest(method, req.path, statusCode, duration);

      // Log with context (correlation ID added automatically by logger)
      logger.http(`${method} ${url} ${statusCode} - ${duration}ms`);
    });

    next();
  });
}
