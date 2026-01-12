// Logging Types for Backend Observability System

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogModule = 'api' | 'ws' | 'auth' | 'db' | 'service' | 'system';

export type LogEnvironment = 'development' | 'test' | 'production';

/**
 * Structured log event matching the proposal schema.
 * All backend logs conform to this structure for consistent parsing.
 */
export interface LogEvent {
  // Required fields
  ts: string; // ISO-8601 timestamp (UTC)
  level: LogLevel;
  service: string; // e.g., 'sentinel-backend'
  env: LogEnvironment;
  msg: string;

  // Recommended fields
  module?: LogModule;
  event?: string; // Machine-friendly event name, e.g., 'http.request', 'ws.connect'

  // Correlation / identity
  requestId?: string;
  correlationId?: string;
  socketId?: string;
  userId?: string;
  visitorId?: string;
  sessionId?: string;
  kioskId?: string;

  // HTTP context (only for HTTP-related logs)
  http?: {
    method: string;
    path: string;
    statusCode?: number;
    durationMs?: number;
    ip?: string;
    userAgent?: string;
  };

  // WebSocket context (only for WS logs)
  ws?: {
    direction?: 'in' | 'out';
    type?: string; // Message type/event name
    sizeBytes?: number;
    channel?: string;
  };

  // Error context
  err?: {
    name?: string;
    message: string;
    stack?: string;
    code?: string | number;
  };

  // Arbitrary metadata (sanitized)
  meta?: Record<string, unknown>;
}

/**
 * Filter criteria for log streaming.
 * Used by both backend (server-side filtering) and frontend (UI controls).
 */
export interface LogFilter {
  levels?: LogLevel[];
  modules?: LogModule[];
  requestId?: string;
  search?: string; // Free-text search in msg field
}

/**
 * WebSocket events for real-time log streaming (dev-only feature).
 */
export interface LogStreamServerToClientEvents {
  log_event: (event: LogEvent) => void;
  log_backfill: (events: LogEvent[]) => void;
}

export interface LogStreamClientToServerEvents {
  subscribe_logs: (filter: LogFilter) => void;
  unsubscribe_logs: () => void;
  update_log_filter: (filter: LogFilter) => void;
}

/**
 * Log level numeric values for comparison/filtering.
 */
export const LOG_LEVEL_VALUES: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

/**
 * Check if a log event matches the given filter criteria.
 */
export function matchesLogFilter(event: LogEvent, filter: LogFilter): boolean {
  // Level filter
  if (filter.levels && filter.levels.length > 0) {
    if (!filter.levels.includes(event.level)) {
      return false;
    }
  }

  // Module filter
  if (filter.modules && filter.modules.length > 0) {
    if (!event.module || !filter.modules.includes(event.module)) {
      return false;
    }
  }

  // RequestId filter (exact match)
  if (filter.requestId) {
    const matchesRequestId =
      event.requestId === filter.requestId ||
      event.correlationId === filter.requestId;
    if (!matchesRequestId) {
      return false;
    }
  }

  // Search filter (case-insensitive substring in msg)
  if (filter.search) {
    const searchLower = filter.search.toLowerCase();
    const msgMatch = event.msg.toLowerCase().includes(searchLower);
    const eventMatch = event.event?.toLowerCase().includes(searchLower) ?? false;
    if (!msgMatch && !eventMatch) {
      return false;
    }
  }

  return true;
}
