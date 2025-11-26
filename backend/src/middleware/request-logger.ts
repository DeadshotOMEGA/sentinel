import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const startTime = Date.now();

  // Log request when response finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const { method, url } = req;
    const { statusCode } = res;

    logger.http(`${method} ${url} ${statusCode} - ${duration}ms`);
  });

  next();
}
