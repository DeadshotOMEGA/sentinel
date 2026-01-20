# Monitoring Documentation (AI-First Guide)

**Purpose:** Logging, metrics, alerts, and observability documentation

**AI Context Priority:** medium

**When to Load:** User working on logging, metrics, monitoring, debugging

**Triggers:** logging, logs, metrics, monitoring, winston, observability, correlation

---

## Quick Reference

### What's Here

Monitoring and observability documentation:
- Structured logging (Winston)
- Correlation IDs
- Health checks
- Performance metrics
- Error tracking
- Alert configuration

### Current Status

**Phase 4 of Backend Rebuild** - Not yet fully implemented
**See:** [Backend Rebuild Plan - Phase 4.1](../../plans/active/backend-rebuild-plan.md#41-monitoring--observability)

---

## Logging Strategy

### Winston Structured Logging

**Log levels:**
- `error` - Errors requiring attention
- `warn` - Warning conditions
- `info` - Informational messages
- `debug` - Debug information

**Log format:**
```json
{
  "timestamp": "2026-01-19T10:30:00.000Z",
  "level": "info",
  "message": "Request completed",
  "module": "api",
  "correlationId": "abc-123-def",
  "method": "GET",
  "path": "/api/members",
  "statusCode": 200,
  "duration": 45
}
```

### Correlation IDs

**Purpose:** Track requests across services and logs

**Implementation:**
```typescript
// Middleware adds correlation ID to all requests
const correlationId = req.headers['x-correlation-id'] || uuidv4()
res.setHeader('x-correlation-id', correlationId)

// All logs include correlation ID
logger.info('Request started', { correlationId })
```

**Benefits:**
- Trace request through entire system
- Debug issues across multiple logs
- Performance analysis per request

---

## Code Locations

**Logger setup:**
- [apps/backend/src/lib/logger.ts](../../../../apps/backend/src/lib/logger.ts) - Winston config

**Middleware:**
- [apps/backend/src/middleware/request-logger.ts](../../../../apps/backend/src/middleware/request-logger.ts) - Correlation IDs

**Health checks:**
- [apps/backend/src/routes/health.ts](../../../../apps/backend/src/routes/health.ts) - Health endpoints

---

## Document Examples

### Explanation Docs
- `explanation-correlation-ids.md` - How correlation tracking works
- `explanation-structured-logging.md` - Logging philosophy
- `explanation-health-checks.md` - Health monitoring approach

### Reference Docs
- `reference-log-format.md` - Log structure specification
- `reference-health-endpoints.md` - Health check API
- `reference-metrics.md` - Available metrics

### How-to Docs
- `howto-add-logging.md` - Add logging to new code
- `howto-trace-request.md` - Use correlation IDs to debug
- `howto-monitor-performance.md` - Track performance metrics
- `howto-set-up-alerts.md` - Configure alert rules

---

## Health Endpoints

### /health

**Purpose:** Overall system health

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-19T10:30:00.000Z",
  "checks": {
    "database": "healthy",
    "redis": "healthy"
  }
}
```

**Status codes:**
- 200: All systems healthy
- 503: One or more systems unhealthy

### /ready

**Purpose:** Kubernetes readiness probe

**Checks:**
- Can connect to database
- Can connect to Redis
- Application initialized

### /live

**Purpose:** Kubernetes liveness probe

**Checks:**
- Process is running
- Not deadlocked

### /metrics

**Purpose:** Performance metrics

**Provides:**
- Request count
- Response times (p50, p95, p99)
- Error rates
- Active connections
- Database query times

---

## Logging Best Practices

### What to Log

**✅ Do log:**
- Request start/end with timing
- Authentication attempts (success/failure)
- Database errors
- External API calls
- Business events (check-ins, member creation)
- Configuration changes

**❌ Don't log:**
- Passwords or secrets
- Personal info (beyond what's necessary)
- Sensitive data
- Binary data
- Excessive debug info in production

### Log Levels

**Error:**
```typescript
logger.error('Database connection failed', {
  error: error.message,
  stack: error.stack,
  correlationId
})
```

**Info:**
```typescript
logger.info('Member created', {
  memberId: member.id,
  serviceNumber: member.serviceNumber,
  correlationId
})
```

**Debug:**
```typescript
logger.debug('Query executed', {
  query: sql,
  params: params,
  duration: duration,
  correlationId
})
```

---

## Performance Monitoring

### Key Metrics

**Request metrics:**
- Requests per second
- Average response time
- P95/P99 response times
- Error rate

**Database metrics:**
- Query count
- Query duration
- Connection pool usage
- Slow queries (> 100ms)

**WebSocket metrics:**
- Active connections
- Messages per second
- Connection errors

### Monitoring Tools

**Development:**
- Winston console logs
- Health endpoints
- Local metrics

**Production (planned):**
- Log aggregation (e.g., CloudWatch, Datadog)
- Metrics dashboard (Grafana)
- Error tracking (Sentry)
- APM (Application Performance Monitoring)

---

## Alert Configuration

### Alert Triggers

**Critical:**
- Health check failures
- Error rate > 5%
- Response time > 1000ms (P95)
- Database connection failures

**Warning:**
- Error rate > 1%
- Response time > 500ms (P95)
- Memory usage > 80%
- Disk usage > 80%

### Alert Channels

**Planned:**
- Email notifications
- Slack integration
- PagerDuty (for on-call)

---

## Debugging with Logs

### Finding Issues

**By correlation ID:**
```bash
grep "abc-123-def" logs/*.log
```

**By error:**
```bash
grep '"level":"error"' logs/*.log | jq .
```

**By endpoint:**
```bash
grep '"/api/members"' logs/*.log | jq '.duration'
```

### Log Analysis

**Common patterns:**
- High response times → Performance issue
- 401 errors → Auth problems
- 404 errors → Client bugs or missing data
- 500 errors → Server bugs

---

## Related Documentation

**Implementation:**
- [Backend Rebuild Plan - Phase 4.1](../../plans/active/backend-rebuild-plan.md#41-monitoring--observability)

**Cross-cutting:**
- [Deployment](../deployment/CLAUDE.md) - CI/CD integration
- [Testing](../testing/CLAUDE.md) - Test monitoring

**Domains:**
- All domains benefit from structured logging

---

**Last Updated:** 2026-01-19
