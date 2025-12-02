import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordRequest,
  getMetrics,
  resetMetrics,
  incrementWsConnections,
  decrementWsConnections,
} from '../metrics';

describe('Metrics', () => {
  beforeEach(() => {
    resetMetrics();
  });

  describe('recordRequest', () => {
    it('should record a successful request', () => {
      recordRequest('GET', '/api/members', 200, 50);

      const metrics = getMetrics();
      expect(metrics.requests.total).toBe(1);
      expect(metrics.requests.errors).toBe(0);
      expect(metrics.requests.byEndpoint).toHaveLength(1);
      expect(metrics.requests.byEndpoint[0]).toEqual({
        endpoint: 'GET /api/members',
        count: 1,
        avgDuration: 50,
        maxDuration: 50,
        errors: 0,
      });
    });

    it('should record an error request', () => {
      recordRequest('POST', '/api/members', 500, 100);

      const metrics = getMetrics();
      expect(metrics.requests.total).toBe(1);
      expect(metrics.requests.errors).toBe(1);
      expect(metrics.requests.errorRate).toBe(100);
    });

    it('should aggregate multiple requests to same endpoint', () => {
      recordRequest('GET', '/api/members', 200, 50);
      recordRequest('GET', '/api/members', 200, 100);
      recordRequest('GET', '/api/members', 500, 150);

      const metrics = getMetrics();
      expect(metrics.requests.total).toBe(3);
      expect(metrics.requests.errors).toBe(1);
      expect(metrics.requests.byEndpoint[0]).toEqual({
        endpoint: 'GET /api/members',
        count: 3,
        avgDuration: 100, // (50 + 100 + 150) / 3
        maxDuration: 150,
        errors: 1,
      });
    });

    it('should normalize paths with UUIDs', () => {
      recordRequest('GET', '/api/members/550e8400-e29b-41d4-a716-446655440000', 200, 50);

      const metrics = getMetrics();
      expect(metrics.requests.byEndpoint[0].endpoint).toBe('GET /api/members/:id');
    });

    it('should normalize paths with numeric IDs', () => {
      recordRequest('GET', '/api/events/123/attendees', 200, 50);

      const metrics = getMetrics();
      expect(metrics.requests.byEndpoint[0].endpoint).toBe('GET /api/events/:id/attendees');
    });

    it('should strip query strings', () => {
      recordRequest('GET', '/api/members?page=1&limit=10', 200, 50);

      const metrics = getMetrics();
      expect(metrics.requests.byEndpoint[0].endpoint).toBe('GET /api/members');
    });
  });

  describe('WebSocket connections', () => {
    it('should track WebSocket connection count', () => {
      incrementWsConnections();
      incrementWsConnections();
      incrementWsConnections();

      const metrics = getMetrics();
      expect(metrics.connections.websocket).toBe(3);
    });

    it('should decrement WebSocket connection count', () => {
      incrementWsConnections();
      incrementWsConnections();
      decrementWsConnections();

      const metrics = getMetrics();
      expect(metrics.connections.websocket).toBe(1);
    });

    it('should not go below zero', () => {
      decrementWsConnections();
      decrementWsConnections();

      const metrics = getMetrics();
      expect(metrics.connections.websocket).toBe(0);
    });
  });

  describe('getMetrics', () => {
    it('should include uptime', () => {
      const metrics = getMetrics();
      expect(metrics.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should calculate error rate correctly', () => {
      recordRequest('GET', '/api/a', 200, 10);
      recordRequest('GET', '/api/b', 200, 10);
      recordRequest('GET', '/api/c', 500, 10);
      recordRequest('GET', '/api/d', 404, 10);

      const metrics = getMetrics();
      expect(metrics.requests.errorRate).toBe(50); // 2/4 = 50%
    });

    it('should sort endpoints by count', () => {
      recordRequest('GET', '/api/a', 200, 10);
      recordRequest('GET', '/api/b', 200, 10);
      recordRequest('GET', '/api/b', 200, 10);
      recordRequest('GET', '/api/c', 200, 10);
      recordRequest('GET', '/api/c', 200, 10);
      recordRequest('GET', '/api/c', 200, 10);

      const metrics = getMetrics();
      expect(metrics.requests.byEndpoint[0].endpoint).toBe('GET /api/c');
      expect(metrics.requests.byEndpoint[1].endpoint).toBe('GET /api/b');
      expect(metrics.requests.byEndpoint[2].endpoint).toBe('GET /api/a');
    });
  });
});
