/**
 * Sentry integration for error tracking.
 * Captures unhandled exceptions with request correlation.
 */

import * as Sentry from '@sentry/node';
import { getRequestContext } from './request-context';

let initialized = false;

/**
 * Initialize Sentry error tracking.
 * Only initializes if SENTRY_DSN is configured.
 */
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    // Sentry is optional - skip initialization if DSN not configured
    return;
  }

  if (initialized) {
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.APP_VERSION || undefined,

    // Sample rate for performance monitoring (10%)
    tracesSampleRate: 0.1,

    // Don't send PII
    sendDefaultPii: false,

    // Integrations
    integrations: [
      // HTTP integration for request tracing
      Sentry.httpIntegration(),
    ],

    // Before sending, add request context
    beforeSend(event, hint) {
      // Add correlation ID from request context
      const context = getRequestContext();
      if (context) {
        event.tags = {
          ...event.tags,
          correlationId: context.correlationId,
          requestId: context.requestId,
        };

        if (context.userId) {
          event.user = {
            ...event.user,
            id: context.userId,
          };
        }
      }

      // Scrub sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
          if (breadcrumb.data) {
            // Remove sensitive headers
            if (breadcrumb.data.headers) {
              const headers = breadcrumb.data.headers as Record<string, string>;
              delete headers.authorization;
              delete headers.cookie;
              delete headers['x-api-key'];
            }
          }
          return breadcrumb;
        });
      }

      return event;
    },
  });

  initialized = true;
}

/**
 * Capture an exception with optional context.
 * Automatically includes request context (correlationId, userId).
 */
export function captureException(
  error: Error,
  context?: Record<string, unknown>
): string | undefined {
  if (!initialized) {
    return undefined;
  }

  return Sentry.withScope((scope) => {
    // Add request context
    const requestContext = getRequestContext();
    if (requestContext) {
      scope.setTag('correlationId', requestContext.correlationId);
      scope.setTag('requestId', requestContext.requestId);

      if (requestContext.userId) {
        scope.setUser({ id: requestContext.userId });
      }
    }

    // Add custom context
    if (context) {
      if (context.requestId) {
        scope.setTag('requestId', String(context.requestId));
      }
      if (context.userId) {
        scope.setUser({ id: String(context.userId) });
      }
      if (context.route) {
        scope.setTag('route', String(context.route));
      }
      if (context.method) {
        scope.setTag('method', String(context.method));
      }

      // Set extra context
      scope.setExtras(context);
    }

    return Sentry.captureException(error);
  });
}

/**
 * Capture a message with severity level.
 */
export function captureMessage(
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info'
): string | undefined {
  if (!initialized) {
    return undefined;
  }

  return Sentry.captureMessage(message, level);
}

/**
 * Add a breadcrumb for debugging.
 */
export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, unknown>
): void {
  if (!initialized) {
    return;
  }

  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level: 'info',
  });
}

/**
 * Set user context for all subsequent events.
 */
export function setUser(userId: string, extra?: Record<string, string>): void {
  if (!initialized) {
    return;
  }

  Sentry.setUser({
    id: userId,
    ...extra,
  });
}

/**
 * Clear user context.
 */
export function clearUser(): void {
  if (!initialized) {
    return;
  }

  Sentry.setUser(null);
}

/**
 * Flush pending events before shutdown.
 */
export async function flushSentry(timeout = 2000): Promise<boolean> {
  if (!initialized) {
    return true;
  }

  return Sentry.flush(timeout);
}

/**
 * Check if Sentry is initialized.
 */
export function isSentryInitialized(): boolean {
  return initialized;
}
