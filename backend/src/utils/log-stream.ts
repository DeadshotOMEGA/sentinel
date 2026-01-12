/**
 * LogStreamManager - Singleton for managing live log streaming to admin clients.
 *
 * Features:
 * - Circular buffer for backfill (last 100 logs)
 * - Subscriber management with per-client filters
 * - Backpressure handling (drop if client buffer full)
 * - Dev-only gating
 */

import type { Socket } from 'socket.io';
import type {
  LogEvent,
  LogFilter,
} from '../../../shared/types/logging';
import { matchesLogFilter } from '../../../shared/types/logging';

const BUFFER_SIZE = 100;
const MAX_SUBSCRIBERS = 10; // Limit concurrent log viewers

/**
 * Check if live log streaming is enabled.
 * Must be in development mode AND have ENABLE_LIVE_LOGS=true.
 */
export function isLiveLogsEnabled(): boolean {
  return (
    process.env.NODE_ENV === 'development' &&
    process.env.ENABLE_LIVE_LOGS === 'true'
  );
}

interface Subscriber {
  socket: Socket;
  filter: LogFilter;
  droppedCount: number;
}

class LogStreamManager {
  private buffer: LogEvent[] = [];
  private subscribers: Map<string, Subscriber> = new Map();
  private enabled: boolean;

  constructor() {
    this.enabled = isLiveLogsEnabled();
  }

  /**
   * Check if streaming is enabled.
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Re-check enabled state (useful after env changes in tests).
   */
  refreshEnabled(): void {
    this.enabled = isLiveLogsEnabled();
  }

  /**
   * Emit a log event to the buffer and all matching subscribers.
   */
  emit(event: LogEvent): void {
    if (!this.enabled) return;

    // Add to circular buffer
    this.buffer.push(event);
    if (this.buffer.length > BUFFER_SIZE) {
      this.buffer.shift();
    }

    // Broadcast to matching subscribers
    for (const [socketId, subscriber] of this.subscribers) {
      if (matchesLogFilter(event, subscriber.filter)) {
        try {
          // Check if socket is still connected
          if (subscriber.socket.connected) {
            subscriber.socket.emit('log_event', event);
          } else {
            // Clean up disconnected socket
            this.subscribers.delete(socketId);
          }
        } catch {
          // Socket write failed (backpressure)
          subscriber.droppedCount++;
          if (subscriber.droppedCount > 100) {
            // Too many drops, disconnect
            subscriber.socket.emit('log_event', {
              ts: new Date().toISOString(),
              level: 'warn',
              service: 'sentinel-backend',
              env: process.env.NODE_ENV as LogEvent['env'],
              msg: 'Log stream disconnected due to backpressure',
              module: 'system',
              event: 'log.backpressure',
            } satisfies LogEvent);
            this.unsubscribe(socketId);
          }
        }
      }
    }
  }

  /**
   * Subscribe a socket to the log stream with a filter.
   */
  subscribe(socketId: string, socket: Socket, filter: LogFilter): boolean {
    if (!this.enabled) {
      return false;
    }

    if (this.subscribers.size >= MAX_SUBSCRIBERS) {
      return false;
    }

    this.subscribers.set(socketId, {
      socket,
      filter,
      droppedCount: 0,
    });

    return true;
  }

  /**
   * Unsubscribe a socket from the log stream.
   */
  unsubscribe(socketId: string): void {
    this.subscribers.delete(socketId);
  }

  /**
   * Update the filter for an existing subscriber.
   */
  updateFilter(socketId: string, filter: LogFilter): boolean {
    const subscriber = this.subscribers.get(socketId);
    if (!subscriber) {
      return false;
    }

    subscriber.filter = filter;
    subscriber.droppedCount = 0; // Reset drop count on filter change
    return true;
  }

  /**
   * Get backfill logs matching the given filter.
   */
  getBackfill(filter: LogFilter): LogEvent[] {
    if (!this.enabled) {
      return [];
    }

    return this.buffer.filter((event) => matchesLogFilter(event, filter));
  }

  /**
   * Check if a socket is subscribed.
   */
  isSubscribed(socketId: string): boolean {
    return this.subscribers.has(socketId);
  }

  /**
   * Get current subscriber count.
   */
  getSubscriberCount(): number {
    return this.subscribers.size;
  }

  /**
   * Clear all subscribers (useful for testing).
   */
  clearSubscribers(): void {
    this.subscribers.clear();
  }

  /**
   * Clear buffer (useful for testing).
   */
  clearBuffer(): void {
    this.buffer = [];
  }
}

// Singleton instance
export const logStreamManager = new LogStreamManager();
