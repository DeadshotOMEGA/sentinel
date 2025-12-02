import type { Socket } from 'socket.io';
import { redis } from '../db/redis';
import { logger } from '../utils/logger';

const WS_RATE_LIMIT_WINDOW = 60; // 1 minute window
const WS_RATE_LIMIT_MAX_CONNECTIONS = 10; // Max connections per IP per window
const WS_RATE_LIMIT_MAX_EVENTS = 100; // Max events per socket per minute

/**
 * Extract client IP from Socket.IO handshake
 */
function getClientIp(socket: Socket): string | null {
  // Handle missing handshake (e.g., in tests)
  if (!socket.handshake) {
    return null;
  }
  // Check x-forwarded-for header first (for reverse proxy)
  const forwardedFor = socket.handshake.headers?.['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0].trim();
  }
  // Fall back to direct connection address
  if (!socket.handshake.address) {
    return null;
  }
  return socket.handshake.address;
}

/**
 * Check if connection is rate limited
 * Returns true if connection should be rejected
 */
export async function isConnectionRateLimited(socket: Socket): Promise<boolean> {
  const ip = getClientIp(socket);

  // Skip rate limiting if IP cannot be determined (e.g., in tests)
  if (ip === null) {
    logger.warn('Could not determine client IP for rate limiting, skipping check');
    return false;
  }

  const key = `rl:ws-conn:${ip}`;

  try {
    const current = await redis.incr(key);

    // Set expiry on first increment
    if (current === 1) {
      await redis.expire(key, WS_RATE_LIMIT_WINDOW);
    }

    if (current > WS_RATE_LIMIT_MAX_CONNECTIONS) {
      logger.warn(`WebSocket connection rate limit exceeded for IP: ${ip} (${current}/${WS_RATE_LIMIT_MAX_CONNECTIONS})`);
      return true;
    }

    return false;
  } catch (error) {
    // On Redis error, allow connection but log warning
    logger.error('Redis error during WebSocket rate limit check:', error);
    return false;
  }
}

/**
 * Per-socket event rate limiter
 * Tracks event counts per connected socket
 */
export class SocketEventRateLimiter {
  private socketId: string;
  private eventCount: number = 0;
  private windowStart: number = Date.now();

  constructor(socketId: string) {
    this.socketId = socketId;
  }

  /**
   * Check if event should be allowed
   * Returns true if event is allowed, false if rate limited
   */
  checkEvent(): boolean {
    const now = Date.now();

    // Reset window if expired
    if (now - this.windowStart > WS_RATE_LIMIT_WINDOW * 1000) {
      this.eventCount = 0;
      this.windowStart = now;
    }

    this.eventCount++;

    if (this.eventCount > WS_RATE_LIMIT_MAX_EVENTS) {
      logger.warn(`Socket ${this.socketId} exceeded event rate limit (${this.eventCount}/${WS_RATE_LIMIT_MAX_EVENTS})`);
      return false;
    }

    return true;
  }
}

/**
 * Decrement connection count when socket disconnects
 * Helps prevent counting long-lived connections against the limit
 */
export async function decrementConnectionCount(socket: Socket): Promise<void> {
  const ip = getClientIp(socket);

  // Skip if IP cannot be determined
  if (ip === null) {
    return;
  }

  const key = `rl:ws-conn:${ip}`;

  try {
    const current = await redis.decr(key);
    // Ensure we don't go negative
    if (current < 0) {
      await redis.set(key, '0', 'EX', WS_RATE_LIMIT_WINDOW);
    }
  } catch (error) {
    logger.error('Redis error during connection count decrement:', error);
  }
}
