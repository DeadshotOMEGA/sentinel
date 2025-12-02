/**
 * Simple in-memory metrics for monitoring.
 * In production, this would be replaced with Prometheus/Datadog/etc.
 */

interface RequestMetric {
  count: number;
  totalDuration: number;
  maxDuration: number;
  errors: number;
}

interface MetricsStore {
  requests: Map<string, RequestMetric>;
  startTime: number;
  totalRequests: number;
  totalErrors: number;
  activeConnections: number;
  wsConnections: number;
}

const store: MetricsStore = {
  requests: new Map(),
  startTime: Date.now(),
  totalRequests: 0,
  totalErrors: 0,
  activeConnections: 0,
  wsConnections: 0,
};

/**
 * Record a completed request
 */
export function recordRequest(
  method: string,
  path: string,
  statusCode: number,
  durationMs: number
): void {
  const key = `${method} ${normalizePathForMetrics(path)}`;
  const existing = store.requests.get(key);
  const isError = statusCode >= 400;

  store.totalRequests++;
  if (isError) {
    store.totalErrors++;
  }

  if (existing) {
    existing.count++;
    existing.totalDuration += durationMs;
    existing.maxDuration = Math.max(existing.maxDuration, durationMs);
    if (isError) {
      existing.errors++;
    }
  } else {
    store.requests.set(key, {
      count: 1,
      totalDuration: durationMs,
      maxDuration: durationMs,
      errors: isError ? 1 : 0,
    });
  }
}

/**
 * Normalize path for metrics (replace IDs with placeholders)
 */
function normalizePathForMetrics(path: string): string {
  // Replace UUIDs with :id
  return path
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
    // Replace numeric IDs with :id
    .replace(/\/\d+/g, '/:id')
    // Remove query strings
    .split('?')[0];
}

/**
 * Increment WebSocket connection count
 */
export function incrementWsConnections(): void {
  store.wsConnections++;
}

/**
 * Decrement WebSocket connection count
 */
export function decrementWsConnections(): void {
  store.wsConnections = Math.max(0, store.wsConnections - 1);
}

/**
 * Get current metrics snapshot
 */
export function getMetrics(): {
  uptime: number;
  requests: {
    total: number;
    errors: number;
    errorRate: number;
    byEndpoint: Array<{
      endpoint: string;
      count: number;
      avgDuration: number;
      maxDuration: number;
      errors: number;
    }>;
  };
  connections: {
    websocket: number;
  };
} {
  const uptimeSeconds = Math.floor((Date.now() - store.startTime) / 1000);
  const errorRate = store.totalRequests > 0
    ? (store.totalErrors / store.totalRequests) * 100
    : 0;

  const byEndpoint = Array.from(store.requests.entries())
    .map(([endpoint, metric]) => ({
      endpoint,
      count: metric.count,
      avgDuration: Math.round(metric.totalDuration / metric.count),
      maxDuration: metric.maxDuration,
      errors: metric.errors,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20); // Top 20 endpoints

  return {
    uptime: uptimeSeconds,
    requests: {
      total: store.totalRequests,
      errors: store.totalErrors,
      errorRate: Math.round(errorRate * 100) / 100,
      byEndpoint,
    },
    connections: {
      websocket: store.wsConnections,
    },
  };
}

/**
 * Reset metrics (useful for testing)
 */
export function resetMetrics(): void {
  store.requests.clear();
  store.startTime = Date.now();
  store.totalRequests = 0;
  store.totalErrors = 0;
  store.activeConnections = 0;
  store.wsConnections = 0;
}
