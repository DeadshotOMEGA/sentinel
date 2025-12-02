import { describe, it, expect } from 'vitest';
import {
  createRequestContext,
  runWithContext,
  getRequestContext,
  getCorrelationId,
  setContextUserId,
} from '../request-context';

describe('RequestContext', () => {
  describe('createRequestContext', () => {
    it('should create context with generated IDs', () => {
      const context = createRequestContext({});

      expect(context.correlationId).toBeDefined();
      expect(context.requestId).toBeDefined();
      expect(context.correlationId).toMatch(/^[0-9a-f-]{36}$/);
      expect(context.requestId).toMatch(/^[0-9a-f-]{36}$/);
      expect(context.startTime).toBeGreaterThan(0);
    });

    it('should use provided correlation ID', () => {
      const context = createRequestContext({
        correlationId: 'custom-correlation-id',
      });

      expect(context.correlationId).toBe('custom-correlation-id');
    });

    it('should include optional fields', () => {
      const context = createRequestContext({
        path: '/api/test',
        method: 'POST',
        userId: 'user-123',
      });

      expect(context.path).toBe('/api/test');
      expect(context.method).toBe('POST');
      expect(context.userId).toBe('user-123');
    });
  });

  describe('runWithContext', () => {
    it('should make context available within callback', () => {
      const context = createRequestContext({ path: '/test' });

      runWithContext(context, () => {
        const retrievedContext = getRequestContext();
        expect(retrievedContext).toBe(context);
        expect(retrievedContext?.path).toBe('/test');
      });
    });

    it('should return value from callback', () => {
      const context = createRequestContext({});

      const result = runWithContext(context, () => {
        return 'test-result';
      });

      expect(result).toBe('test-result');
    });

    it('should isolate contexts between runs', () => {
      const context1 = createRequestContext({ path: '/first' });
      const context2 = createRequestContext({ path: '/second' });

      runWithContext(context1, () => {
        expect(getRequestContext()?.path).toBe('/first');
      });

      runWithContext(context2, () => {
        expect(getRequestContext()?.path).toBe('/second');
      });
    });
  });

  describe('getCorrelationId', () => {
    it('should return correlation ID from context', () => {
      const context = createRequestContext({
        correlationId: 'test-correlation-id',
      });

      runWithContext(context, () => {
        expect(getCorrelationId()).toBe('test-correlation-id');
      });
    });

    it('should generate new ID when outside context', () => {
      const id = getCorrelationId();
      expect(id).toMatch(/^[0-9a-f-]{36}$/);
    });
  });

  describe('setContextUserId', () => {
    it('should update context with user ID', () => {
      const context = createRequestContext({});

      runWithContext(context, () => {
        expect(getRequestContext()?.userId).toBeUndefined();

        setContextUserId('user-456');

        expect(getRequestContext()?.userId).toBe('user-456');
      });
    });

    it('should do nothing when outside context', () => {
      // Should not throw
      setContextUserId('user-789');
    });
  });
});
