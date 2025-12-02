import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

export interface RequestContext {
  correlationId: string;
  requestId: string;
  startTime: number;
  userId?: string;
  path?: string;
  method?: string;
}

const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Get the current request context from AsyncLocalStorage
 */
export function getRequestContext(): RequestContext | undefined {
  return asyncLocalStorage.getStore();
}

/**
 * Get correlation ID from current context, or generate a new one
 */
export function getCorrelationId(): string {
  const context = getRequestContext();
  return context?.correlationId ?? randomUUID();
}

/**
 * Run a function within a request context
 */
export function runWithContext<T>(context: RequestContext, fn: () => T): T {
  return asyncLocalStorage.run(context, fn);
}

/**
 * Create a new request context
 */
export function createRequestContext(options: {
  correlationId?: string;
  path?: string;
  method?: string;
  userId?: string;
}): RequestContext {
  return {
    correlationId: options.correlationId ?? randomUUID(),
    requestId: randomUUID(),
    startTime: Date.now(),
    path: options.path,
    method: options.method,
    userId: options.userId,
  };
}

/**
 * Update the current context with user info (after auth)
 */
export function setContextUserId(userId: string): void {
  const context = getRequestContext();
  if (context) {
    context.userId = userId;
  }
}
