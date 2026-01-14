import type { Request, Response, NextFunction } from 'express';
import { apiLogger } from '../utils/logger';
import type { ErrorInjectionConfig } from '../../../shared/types/dev-mode';

const HEADER_NAME = 'X-Dev-Error-Inject';

/**
 * Parse the error injection header into config
 * Format: fail=0.3,delay=500,status=500,endpoints=/api/checkin,/api/members
 */
function parseErrorInjectionHeader(header: string): ErrorInjectionConfig {
  const config: ErrorInjectionConfig = {
    enabled: true,
    failureRate: 0,
    delayMs: 0,
    statusCode: 500,
    endpoints: [],
  };

  const parts = header.split(',');
  let currentKey: string | null = null;
  let endpointsBuffer: string[] = [];

  for (const part of parts) {
    const trimmed = part.trim();

    // Check if this part contains an = sign
    if (trimmed.includes('=')) {
      // If we were collecting endpoints, finalize them
      if (currentKey === 'endpoints' && endpointsBuffer.length > 0) {
        config.endpoints = endpointsBuffer;
        endpointsBuffer = [];
      }

      const [key, value] = trimmed.split('=');
      const normalizedKey = key.toLowerCase();

      switch (normalizedKey) {
        case 'fail':
          config.failureRate = parseFloat(value);
          if (isNaN(config.failureRate) || config.failureRate < 0 || config.failureRate > 1) {
            throw new Error(`Invalid failure rate: ${value}. Must be between 0 and 1.`);
          }
          currentKey = 'fail';
          break;

        case 'delay':
          config.delayMs = parseInt(value, 10);
          if (isNaN(config.delayMs) || config.delayMs < 0) {
            throw new Error(`Invalid delay: ${value}. Must be a positive number.`);
          }
          currentKey = 'delay';
          break;

        case 'status':
          config.statusCode = parseInt(value, 10);
          if (isNaN(config.statusCode) || config.statusCode < 400 || config.statusCode > 599) {
            throw new Error(`Invalid status code: ${value}. Must be between 400 and 599.`);
          }
          currentKey = 'status';
          break;

        case 'endpoints':
          currentKey = 'endpoints';
          // Value is the first endpoint
          if (value) {
            endpointsBuffer.push(value.trim());
          }
          break;

        default:
          throw new Error(`Unknown error injection parameter: ${key}`);
      }
    } else if (currentKey === 'endpoints' && trimmed.startsWith('/')) {
      // This is a continuation of endpoints (comma-separated paths)
      endpointsBuffer.push(trimmed);
    }
  }

  // Finalize endpoints if we ended while collecting them
  if (currentKey === 'endpoints' && endpointsBuffer.length > 0) {
    config.endpoints = endpointsBuffer;
  }

  return config;
}

/**
 * Check if the current request path matches any of the configured endpoints
 */
function matchesEndpoint(requestPath: string, endpoints: string[]): boolean {
  if (endpoints.length === 0) {
    return true; // Empty means all endpoints
  }

  return endpoints.some((endpoint) => {
    // Exact match or prefix match with path continuation
    return requestPath === endpoint || requestPath.startsWith(endpoint + '/');
  });
}

/**
 * Delay helper that returns a promise
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Error injection middleware for development testing
 *
 * Reads configuration from X-Dev-Error-Inject header
 * Format: fail=0.3,delay=500,status=500,endpoints=/api/checkin,/api/members
 *
 * - fail=0.3: 30% chance to fail the request
 * - delay=500: Add 500ms artificial delay
 * - status=500: Use this status code for failures
 * - endpoints=/api/checkin,/api/members: Only apply to these endpoints (comma-separated)
 *
 * ONLY active when NODE_ENV !== 'production'
 */
export async function errorInjectionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Never run in production
  if (process.env.NODE_ENV === 'production') {
    return next();
  }

  const header = req.get(HEADER_NAME);
  if (!header) {
    return next();
  }

  let config: ErrorInjectionConfig;
  try {
    config = parseErrorInjectionHeader(header);
  } catch (err) {
    apiLogger.warn('Invalid error injection header', {
      header,
      error: err instanceof Error ? err.message : String(err),
    });
    return next();
  }

  // Check if this endpoint should be affected
  if (!matchesEndpoint(req.path, config.endpoints ?? [])) {
    return next();
  }

  // Apply artificial delay if configured
  if (config.delayMs > 0) {
    apiLogger.debug('Applying artificial delay', {
      delayMs: config.delayMs,
      path: req.path,
      method: req.method,
    });
    await delay(config.delayMs);
  }

  // Check for random failure
  if (config.failureRate > 0) {
    const roll = Math.random();
    if (roll < config.failureRate) {
      apiLogger.info('Injecting simulated failure', {
        failureRate: config.failureRate,
        roll: roll.toFixed(3),
        statusCode: config.statusCode,
        path: req.path,
        method: req.method,
      });

      res.status(config.statusCode).json({
        error: {
          code: 'SIMULATED_ERROR',
          message: 'This is a simulated error injected for testing',
          details: `Error injection triggered with ${(config.failureRate * 100).toFixed(0)}% failure rate`,
          injected: true,
        },
      });
      return;
    }
  }

  next();
}
