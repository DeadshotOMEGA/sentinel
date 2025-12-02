import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Socket } from 'socket.io';

// Mocks must be hoisted - use vi.hoisted()
const { mockRedis, mockLogger } = vi.hoisted(() => ({
  mockRedis: {
    incr: vi.fn(),
    decr: vi.fn(),
    expire: vi.fn(),
    set: vi.fn(),
  },
  mockLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../db/redis', () => ({
  redis: mockRedis,
}));

vi.mock('../../utils/logger', () => ({
  logger: mockLogger,
}));

import {
  isConnectionRateLimited,
  decrementConnectionCount,
  SocketEventRateLimiter,
} from '../rate-limit';

describe('WebSocket Rate Limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isConnectionRateLimited', () => {
    const createMockSocket = (address: string, forwardedFor?: string): Socket => {
      const headers: Record<string, string | undefined> = {};
      if (forwardedFor) {
        headers['x-forwarded-for'] = forwardedFor;
      }
      return {
        handshake: {
          address,
          headers,
        },
      } as unknown as Socket;
    };

    it('should allow connections under the rate limit', async () => {
      const socket = createMockSocket('192.168.1.100');
      mockRedis.incr.mockResolvedValue(5);

      const result = await isConnectionRateLimited(socket);

      expect(result).toBe(false);
      expect(mockRedis.incr).toHaveBeenCalledWith('rl:ws-conn:192.168.1.100');
    });

    it('should set expiry on first connection', async () => {
      const socket = createMockSocket('192.168.1.100');
      mockRedis.incr.mockResolvedValue(1);

      await isConnectionRateLimited(socket);

      expect(mockRedis.expire).toHaveBeenCalledWith('rl:ws-conn:192.168.1.100', 60);
    });

    it('should block connections over the rate limit', async () => {
      const socket = createMockSocket('192.168.1.100');
      mockRedis.incr.mockResolvedValue(11); // Over the limit of 10

      const result = await isConnectionRateLimited(socket);

      expect(result).toBe(true);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('WebSocket connection rate limit exceeded')
      );
    });

    it('should use x-forwarded-for header when present', async () => {
      const socket = createMockSocket('10.0.0.1', '203.0.113.50, 70.41.3.18');
      mockRedis.incr.mockResolvedValue(1);

      await isConnectionRateLimited(socket);

      expect(mockRedis.incr).toHaveBeenCalledWith('rl:ws-conn:203.0.113.50');
    });

    it('should skip rate limiting if handshake is missing', async () => {
      const socket = {} as Socket;

      const result = await isConnectionRateLimited(socket);

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Could not determine client IP for rate limiting, skipping check'
      );
      expect(mockRedis.incr).not.toHaveBeenCalled();
    });

    it('should allow connection on Redis error', async () => {
      const socket = createMockSocket('192.168.1.100');
      mockRedis.incr.mockRejectedValue(new Error('Redis connection failed'));

      const result = await isConnectionRateLimited(socket);

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Redis error during WebSocket rate limit check:',
        expect.any(Error)
      );
    });
  });

  describe('decrementConnectionCount', () => {
    it('should decrement connection count on disconnect', async () => {
      const socket = {
        handshake: { address: '192.168.1.100', headers: {} },
      } as unknown as Socket;
      mockRedis.decr.mockResolvedValue(4);

      await decrementConnectionCount(socket);

      expect(mockRedis.decr).toHaveBeenCalledWith('rl:ws-conn:192.168.1.100');
    });

    it('should reset to 0 if count goes negative', async () => {
      const socket = {
        handshake: { address: '192.168.1.100', headers: {} },
      } as unknown as Socket;
      mockRedis.decr.mockResolvedValue(-1);

      await decrementConnectionCount(socket);

      expect(mockRedis.set).toHaveBeenCalledWith('rl:ws-conn:192.168.1.100', '0', 'EX', 60);
    });

    it('should skip if handshake is missing', async () => {
      const socket = {} as Socket;

      await decrementConnectionCount(socket);

      expect(mockRedis.decr).not.toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      const socket = {
        handshake: { address: '192.168.1.100', headers: {} },
      } as unknown as Socket;
      mockRedis.decr.mockRejectedValue(new Error('Redis error'));

      await decrementConnectionCount(socket);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Redis error during connection count decrement:',
        expect.any(Error)
      );
    });
  });

  describe('SocketEventRateLimiter', () => {
    it('should allow events under the rate limit', () => {
      const limiter = new SocketEventRateLimiter('socket-123');

      // First 100 events should be allowed
      for (let i = 0; i < 100; i++) {
        expect(limiter.checkEvent()).toBe(true);
      }
    });

    it('should block events over the rate limit', () => {
      const limiter = new SocketEventRateLimiter('socket-123');

      // Use up the limit
      for (let i = 0; i < 100; i++) {
        limiter.checkEvent();
      }

      // 101st event should be blocked
      expect(limiter.checkEvent()).toBe(false);
    });

    it('should reset count after window expires', () => {
      const limiter = new SocketEventRateLimiter('socket-123');

      // Use up the limit
      for (let i = 0; i < 100; i++) {
        limiter.checkEvent();
      }

      // Fast-forward time by manipulating the internal state
      // @ts-expect-error - accessing private property for testing
      limiter.windowStart = Date.now() - 61000; // 61 seconds ago

      // Should be allowed again
      expect(limiter.checkEvent()).toBe(true);
    });
  });
});
