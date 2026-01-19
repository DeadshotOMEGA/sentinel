/**
 * WebSocket handler for live log streaming (dev-only feature).
 *
 * Security:
 * - Only enabled when NODE_ENV=development AND ENABLE_LIVE_LOGS=true
 * - Requires admin authentication
 * - Uses the existing rate limiter
 */

import type { Socket } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents } from './events';
import { logStreamManager, isLiveLogsEnabled } from '../utils/log-stream';
import { wsLogger } from '../utils/logger';
import type { LogFilter } from '../../../shared/types/logging';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

/**
 * Check if a socket is allowed to subscribe to logs.
 * Only admin-authenticated sockets in development mode can subscribe.
 */
function canSubscribeToLogs(socket: TypedSocket): boolean {
  // Must be enabled
  if (!isLiveLogsEnabled()) {
    wsLogger.debug('Live logs not enabled', {
      event: 'ws.logs.disabled',
      socketId: socket.id,
    });
    return false;
  }

  // Must be authenticated
  if (!socket.auth) {
    wsLogger.warn('Unauthenticated log subscription attempt', {
      event: 'ws.logs.unauthorized',
      socketId: socket.id,
    });
    return false;
  }

  // Must be admin or developer role
  if (socket.auth.role !== 'admin' && socket.auth.role !== 'developer') {
    wsLogger.warn('Unauthorized log subscription attempt', {
      event: 'ws.logs.forbidden',
      socketId: socket.id,
      role: socket.auth.role,
    });
    return false;
  }

  return true;
}

/**
 * Validate and sanitize a log filter from client input.
 */
function validateFilter(input: unknown): LogFilter {
  const filter: LogFilter = {};

  if (!input || typeof input !== 'object') {
    return filter;
  }

  const raw = input as Record<string, unknown>;

  // Validate levels array
  if (Array.isArray(raw.levels)) {
    const validLevels = ['debug', 'info', 'warn', 'error'];
    filter.levels = raw.levels.filter(
      (l): l is 'debug' | 'info' | 'warn' | 'error' =>
        typeof l === 'string' && validLevels.includes(l)
    );
    if (filter.levels.length === 0) {
      delete filter.levels;
    }
  }

  // Validate modules array
  if (Array.isArray(raw.modules)) {
    const validModules = ['api', 'ws', 'auth', 'db', 'service', 'system'];
    filter.modules = raw.modules.filter(
      (m): m is 'api' | 'ws' | 'auth' | 'db' | 'service' | 'system' =>
        typeof m === 'string' && validModules.includes(m)
    );
    if (filter.modules.length === 0) {
      delete filter.modules;
    }
  }

  // Validate requestId (string, max length)
  if (typeof raw.requestId === 'string' && raw.requestId.length > 0) {
    filter.requestId = raw.requestId.slice(0, 64); // Max 64 chars
  }

  // Validate search (string, max length)
  if (typeof raw.search === 'string' && raw.search.length > 0) {
    filter.search = raw.search.slice(0, 100); // Max 100 chars
  }

  return filter;
}

/**
 * Register log stream event handlers on a socket.
 * Called from the main WebSocket server after connection.
 */
export function registerLogStreamHandlers(socket: TypedSocket): void {
  // Handle log subscription
  socket.on('subscribe_logs', (rawFilter: LogFilter) => {
    // Rate limit check
    if (socket.rateLimiter && !socket.rateLimiter.checkEvent()) {
      return;
    }

    // Authorization check
    if (!canSubscribeToLogs(socket)) {
      return;
    }

    const filter = validateFilter(rawFilter);

    // Try to subscribe
    const success = logStreamManager.subscribe(socket.id, socket, filter);

    if (success) {
      wsLogger.info('Client subscribed to logs', {
        event: 'ws.logs.subscribed',
        socketId: socket.id,
        userId: socket.auth?.userId,
        filter,
      });

      // Send backfill
      const backfill = logStreamManager.getBackfill(filter);
      if (backfill.length > 0) {
        socket.emit('log_backfill', backfill);
        wsLogger.debug(`Sent log backfill (${backfill.length} events)`, {
          event: 'ws.logs.backfill',
          socketId: socket.id,
          count: backfill.length,
        });
      }
    } else {
      wsLogger.warn('Failed to subscribe to logs (max subscribers reached)', {
        event: 'ws.logs.subscribe_failed',
        socketId: socket.id,
      });
    }
  });

  // Handle log unsubscription
  socket.on('unsubscribe_logs', () => {
    // Rate limit check
    if (socket.rateLimiter && !socket.rateLimiter.checkEvent()) {
      return;
    }

    if (logStreamManager.isSubscribed(socket.id)) {
      logStreamManager.unsubscribe(socket.id);
      wsLogger.info('Client unsubscribed from logs', {
        event: 'ws.logs.unsubscribed',
        socketId: socket.id,
      });
    }
  });

  // Handle filter updates
  socket.on('update_log_filter', (rawFilter: LogFilter) => {
    // Rate limit check
    if (socket.rateLimiter && !socket.rateLimiter.checkEvent()) {
      return;
    }

    // Must be subscribed
    if (!logStreamManager.isSubscribed(socket.id)) {
      return;
    }

    const filter = validateFilter(rawFilter);
    const success = logStreamManager.updateFilter(socket.id, filter);

    if (success) {
      wsLogger.debug('Client updated log filter', {
        event: 'ws.logs.filter_updated',
        socketId: socket.id,
        filter,
      });
    }
  });
}

/**
 * Clean up log stream subscription when socket disconnects.
 */
export function cleanupLogStreamSubscription(socketId: string): void {
  if (logStreamManager.isSubscribed(socketId)) {
    logStreamManager.unsubscribe(socketId);
    wsLogger.debug('Cleaned up log subscription on disconnect', {
      event: 'ws.logs.cleanup',
      socketId,
    });
  }
}
