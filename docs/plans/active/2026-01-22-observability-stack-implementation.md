---
type: plan
title: "Sentinel Observability Stack Implementation"
status: active
created: 2026-01-22
last_updated: 2026-01-22
lifecycle: active
reviewed: 2026-01-22
expires: 2026-03-22
ai:
  priority: high
  context_load: always
  triggers:
    - observability
    - monitoring
    - swagger
    - grafana
    - loki
    - prometheus
    - metrics
  token_budget: 4000
related_code:
  - apps/backend/src/routes/
  - apps/backend/src/lib/
  - apps/backend/src/middleware/
  - monitoring/
  - docker-compose.yml
---

# Implementation Plan: Complete Observability Stack for Sentinel Backend

## Step 0: Pre-Implementation Checklist (CRITICAL - DO FIRST)

Before starting implementation, complete these preparatory steps to ensure a clean working state.

### 0.1 Check Git Status and Commit Changes

```bash
# Check current status
git status

# Review uncommitted changes
git diff

# If there are uncommitted changes from previous work:
# 1. Review each file
# 2. Stage relevant files
git add <files>

# 3. Create commit(s) with descriptive messages
git commit -m "type: description"

# 4. Ensure working directory is clean
git status  # Should show "nothing to commit, working tree clean"
```

**Why**: Starting with a clean git state prevents mixing observability changes with unrelated work. Makes it easier to review and rollback if needed.

### 0.2 Save Plan to Documentation Location

```bash
# Copy plan to active plans directory with proper naming
cp /home/sauk/.claude/plans/warm-whistling-falcon.md \
   /home/sauk/projects/sentinel/docs/plans/active/2026-01-22-observability-stack-implementation.md
```

### Add Frontmatter

Edit the copied file and add proper frontmatter at the top:

```yaml
---
type: plan
title: "Sentinel Observability Stack Implementation"
status: active
created: 2026-01-22
last_updated: 2026-01-22
lifecycle: active
reviewed: 2026-01-22
expires: 2026-03-22
ai:
  priority: high
  context_load: always
  triggers:
    - observability
    - monitoring
    - swagger
    - grafana
    - loki
    - prometheus
    - metrics
  token_budget: 4000
related_code:
  - apps/backend/src/routes/
  - apps/backend/src/lib/
  - apps/backend/src/middleware/
  - monitoring/
  - docker-compose.yml
---
```

### Update References

After copying, this file at `docs/plans/active/2026-01-22-observability-stack-implementation.md` becomes the primary reference for this implementation. All work should reference the documentation version, not this temporary plan file.

**Why This Matters**:

- Follows Sentinel documentation standards (see `docs/CLAUDE.md`)
- Makes plan discoverable via documentation system
- Includes AI metadata for automatic context loading
- Proper lifecycle tracking with expiration date
- Version controlled with the project

### 0.3 Commit the Plan File

```bash
# Stage the plan file
git add docs/plans/active/2026-01-22-observability-stack-implementation.md

# Commit with descriptive message
git commit -m "docs: add observability stack implementation plan

- Complete plan for Swagger UI, Prometheus, Grafana + Loki
- Includes custom metrics for business operations
- 30-day log retention (production-ready)
- Sentry integration deferred for later"
```

### 0.4 Create Feature Branch

```bash
# Verify you're on the rebuild branch
git branch --show-current  # Should show: rebuild

# Create and checkout new feature branch
git checkout -b feature/observability-stack

# Verify branch creation
git branch --show-current  # Should show: feature/observability-stack
```

**Git Strategy**:

- Base branch: `rebuild` (current working branch)
- Feature branch: `feature/observability-stack`
- Target for PR: `rebuild` branch (not `develop` - per git workflow rules)
- Commit frequency: After each phase completion

### 0.5 Pre-Implementation Verification

Before proceeding to Phase 1, verify:

- [ ] All previous changes committed
- [ ] Working directory clean (`git status`)
- [ ] Plan saved to `docs/plans/active/`
- [ ] Plan committed to git
- [ ] Feature branch created (`feature/observability-stack`)
- [ ] Currently on feature branch
- [ ] Backend tests passing (`pnpm test`)
- [ ] Docker services running (`docker-compose ps`)

**If any checks fail**: Resolve before continuing to Phase 1.

---

## Executive Summary

Implement a complete observability stack including API documentation, error tracking, and log/metrics visualization for the Sentinel RFID attendance tracking backend.

**Scope**: Three components (Sentry deferred)

1. **Winston Logging + Correlation ID** - ✅ Already 90% complete (minor enhancements only)
2. **Swagger UI** - Interactive API documentation at `/docs` endpoint
3. **Grafana + Loki + Prometheus** - Log aggregation, visualization, and metrics

**Deferred**: Sentry.io (can be added later following Phase 4 instructions)

**Target Environment**: Development (with production-ready patterns)

**Configuration Preferences**:

- Grafana password: Auto-generated strong password
- Log retention: 30 days (production-ready)
- Custom metrics: Badge operations, check-ins (in/out), visitor tracking

**Timeline**: 1.5-2 days implementation + testing

---

## Current State Analysis

### What's Already Complete ✅

**Winston Logging Infrastructure (90%)**:

- Winston logger with structured JSON logging
- AsyncLocalStorage for correlation ID tracking
- 5 module-specific loggers (api, db, auth, ws, service)
- Request-logger middleware with correlation ID generation
- Response headers include X-Correlation-ID
- Error handler integration
- Environment-based log format (JSON prod, pretty dev)

**OpenAPI Generation (100%)**:

- Complete OpenAPI spec at `apps/backend/openapi.json`
- Generation script (`pnpm openapi`)
- Documents 32+ endpoints across 10 resources
- ts-rest contracts with Valibot schemas

**Docker Infrastructure (100%)**:

- PostgreSQL 16 with health checks
- Redis 7 with health checks
- Backend multi-stage Dockerfile
- Custom Docker network (sentinel-network)
- Docker Compose profiles (backend, tools)

### What Needs Implementation ❌

1. **Swagger UI hosting** - No `/docs` route, `swagger-ui-express` not installed
2. **Sentry integration** - No `@sentry/node`, no error capturing
3. **Grafana + Loki** - No log aggregation or visualization
4. **Prometheus** - No metrics collection (basic `/metrics` endpoint exists but not Prometheus format)

---

## Implementation Strategy

### Phase Order & Rationale

**Phase 1: Swagger UI (2-3 hours)**

- Quickest win, immediate value for API consumers
- No dependencies on other phases
- Enables testing while implementing monitoring

**Phase 2: Prometheus Metrics (2-3 hours)**

- Foundation for Grafana dashboards
- Independent from Sentry and Loki
- Custom metrics complement logging

**Phase 3: Grafana + Loki (3-4 hours)**

- Depends on Prometheus being ready
- Largest component, most configuration
- Provides immediate log visualization

**Phase 4: Sentry Integration (2-3 hours)**

- Complementary to Loki (errors to Sentry, all logs to Loki)
- Can be implemented independently
- Easiest to disable if needed

**Total Estimated Time**: 9-13 hours

---

## Phase 1: Swagger UI Implementation

### Objective

Host interactive API documentation at `/docs` with authentication support.

### Files to Create

1. **`apps/backend/src/routes/swagger.ts`** (NEW - ~150 lines)
   - Swagger UI router with custom styling
   - ReDoc router for clean reference docs
   - OpenAPI spec router (serves JSON)
   - Load spec from disk with error handling

2. **`apps/backend/src/middleware/swagger-auth.ts`** (NEW - ~100 lines)
   - Conditional authentication middleware
   - Four modes: public (default), basic, session, disabled
   - Environment-driven configuration

### Files to Modify

3. **`apps/backend/src/app.ts`** (MODIFY)
   - Import swagger routers and auth middleware
   - Mount at positions 9-11 (after health, before better-auth):
     ```
     app.use('/docs', swaggerAuth, swaggerRouter)
     app.use('/redoc', swaggerAuth, redocRouter)
     app.use('/openapi.json', openapiRouter)
     ```
   - Skip in test environment

4. **`apps/backend/src/generate-openapi.ts`** (ENHANCE)
   - Add all 23 contracts (currently only 10)
   - Enhanced metadata and authentication docs
   - Complete tag descriptions

5. **`apps/backend/package.json`** (MODIFY)
   - Add dependencies:
     - `swagger-ui-express@^5.0.1`
     - `redoc-express@^2.1.0`
     - `@types/swagger-ui-express@^4.1.6` (dev)
   - Add script: `"docs": "pnpm openapi && echo 'View at http://localhost:3000/docs'"`

6. **`.env.example`** (MODIFY)
   - Add Swagger configuration:
     ```bash
     ENABLE_SWAGGER_AUTH=false  # false | basic | session | disabled
     SWAGGER_USERNAME=admin
     SWAGGER_PASSWORD=changeme
     ```

### Installation Steps

```bash
# 1. Install dependencies
pnpm add swagger-ui-express redoc-express --filter @sentinel/backend
pnpm add -D @types/swagger-ui-express --filter @sentinel/backend

# 2. Create new route files (see detailed code in exploration results)
# 3. Update app.ts to mount routes
# 4. Update environment configuration
# 5. Regenerate OpenAPI with all contracts

# 6. Test
pnpm dev
curl http://localhost:3000/docs        # Should show Swagger UI
curl http://localhost:3000/redoc       # Should show ReDoc
curl http://localhost:3000/openapi.json # Should return JSON spec
```

### Verification Checklist

- [ ] `/docs` loads Swagger UI with all endpoints
- [ ] `/redoc` loads ReDoc interface
- [ ] `/openapi.json` returns valid OpenAPI 3.0.2 spec
- [ ] "Try it out" works for GET endpoints
- [ ] Authentication (JWT/API key) works in Swagger
- [ ] All 23 resources appear in documentation
- [ ] No Content Security Policy violations
- [ ] Public access works (default mode)

---

## Phase 2: Prometheus Metrics Implementation

### Objective

Add RED metrics (Rate, Errors, Duration) and custom business metrics in Prometheus format.

### Files to Create

1. **`apps/backend/src/lib/metrics.ts`** (NEW - ~200 lines)
   - Initialize `prom-client` library
   - Register metrics:
     - `http_requests_total` (Counter) - by method, path, status
     - `http_request_duration_seconds` (Histogram) - by method, path
     - `active_connections` (Gauge)
     - `database_query_duration_seconds` (Histogram)
     - `auth_attempts_total` (Counter) - by result (success/failure)
     - `checkins_total` (Counter) - by direction (in/out)
     - Custom business metrics (badges assigned, events, visitors)
   - Export helper functions for incrementing metrics

2. **`apps/backend/src/middleware/metrics.ts`** (NEW - ~80 lines)
   - Express middleware to track request metrics
   - Capture method, path, status code, duration
   - Increment counters and histograms
   - Track active connections

### Files to Modify

3. **`apps/backend/src/routes/health.ts`** (MODIFY)
   - Replace custom `/metrics` endpoint with Prometheus format:

     ```typescript
     import { register } from "../lib/metrics.js";

     healthRouter.get("/metrics", async (req, res) => {
       res.set("Content-Type", register.contentType);
       res.end(await register.metrics());
     });
     ```

4. **`apps/backend/src/app.ts`** (MODIFY)
   - Import and use metrics middleware after request logger:
     ```typescript
     app.use(requestLogger);
     app.use(metricsMiddleware); // NEW - position 8
     app.use("/api", apiLimiter);
     ```

5. **`apps/backend/package.json`** (MODIFY)
   - Add dependency: `"prom-client": "^15.1.0"`

### Custom Business Metrics

**All User Requested** (implement immediately):

- Badge assignments/unassignments
- Check-ins by direction (in/out)
- Visitor sign-ins/outs
- Event creation
- DDS assignments
- Security alerts created
- Database connection pool stats

### Installation Steps

```bash
# 1. Install prom-client
pnpm add prom-client --filter @sentinel/backend

# 2. Create metrics.ts and middleware
# 3. Update health.ts endpoint
# 4. Mount middleware in app.ts

# 5. Test Prometheus format
curl http://localhost:3000/metrics
# Should see output like:
# # HELP http_requests_total Total HTTP requests
# # TYPE http_requests_total counter
# http_requests_total{method="GET",path="/api/members",status="200"} 42
```

### Verification Checklist

- [ ] `/metrics` returns Prometheus text format
- [ ] Request counters increment on API calls
- [ ] Duration histograms capture latency
- [ ] Custom business metrics appear
- [ ] Metrics survive server restart (reset to 0)
- [ ] No performance impact (<5ms overhead)

---

## Phase 3: Grafana + Loki + Prometheus Stack

### Objective

Complete observability stack with log aggregation, metrics collection, and visualization dashboards.

### Directory Structure to Create

```
monitoring/
├── loki/
│   └── loki-config.yml
├── promtail/
│   └── promtail-config.yml
├── prometheus/
│   └── prometheus.yml
└── grafana/
    ├── provisioning/
    │   ├── datasources/
    │   │   ├── loki.yml
    │   │   └── prometheus.yml
    │   └── dashboards/
    │       └── default.yml
    └── dashboards/
        ├── sentinel-operations.json
        ├── sentinel-auth.json
        ├── sentinel-database.json
        └── sentinel-tracing.json
```

### Configuration Files to Create

1. **`monitoring/loki/loki-config.yml`** (~80 lines)
   - Storage: Filesystem (TSDB schema v13)
   - Retention: 7 days (168h) for development
   - Limits: 10MB ingestion rate, 5MB per-stream
   - Compaction interval: 10 minutes

2. **`monitoring/promtail/promtail-config.yml`** (~70 lines)
   - Docker service discovery via `/var/run/docker.sock`
   - Filter: Only scrape `sentinel-backend` container
   - JSON log parsing (extracts Winston fields)
   - Indexed labels: level, service, module, method, statusCode
   - Metadata: correlationId, userId, message, error, stack

3. **`monitoring/prometheus/prometheus.yml`** (~40 lines)
   - Scrape config for `sentinel-backend` service
   - Scrape interval: 15 seconds
   - Retention: 15 days
   - Static targets: `backend:3000/metrics`

4. **`monitoring/grafana/provisioning/datasources/loki.yml`** (~20 lines)
   - Loki datasource at `http://loki:3100`
   - Correlation ID derived fields (clickable links)

5. **`monitoring/grafana/provisioning/datasources/prometheus.yml`** (~15 lines)
   - Prometheus datasource at `http://prometheus:9090`

6. **`monitoring/grafana/provisioning/dashboards/default.yml`** (~15 lines)
   - Auto-load dashboards from `/var/lib/grafana/dashboards`

### Docker Compose Services

7. **`docker-compose.yml`** (MODIFY - add 4 services)

Add to `services:` section:

```yaml
  # Loki - Log aggregation
  loki:
    image: grafana/loki:2.9.3
    container_name: sentinel-loki
    ports:
      - "3100:3100"
    volumes:
      - ./monitoring/loki/loki-config.yml:/etc/loki/local-config.yaml:ro
      - loki_data:/loki
    command: -config.file=/etc/loki/local-config.yaml
    networks:
      - sentinel-network
    healthcheck:
      test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:3100/ready || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 5
    profiles:
      - monitoring

  # Promtail - Log shipper
  promtail:
    image: grafana/promtail:2.9.3
    container_name: sentinel-promtail
    volumes:
      - ./monitoring/promtail/promtail-config.yml:/etc/promtail/config.yml:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
    command: -config.file=/etc/promtail/config.yml
    networks:
      - sentinel-network
    depends_on:
      loki:
        condition: service_healthy
    profiles:
      - monitoring

  # Prometheus - Metrics collection
  prometheus:
    image: prom/prometheus:v2.48.1
    container_name: sentinel-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=15d'
    networks:
      - sentinel-network
    profiles:
      - monitoring

  # Grafana - Visualization
  grafana:
    image: grafana/grafana:10.2.3
    container_name: sentinel-grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD:-changeme}
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_SERVER_ROOT_URL=http://localhost:3001
      - GF_AUTH_ANONYMOUS_ENABLED=false
    volumes:
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning:ro
      - ./monitoring/grafana/dashboards:/var/lib/grafana/dashboards:ro
      - grafana_data:/var/lib/grafana
    networks:
      - sentinel-network
    depends_on:
      loki:
        condition: service_healthy
      prometheus:
        condition: service_started
    profiles:
      - monitoring

volumes:
  # ... existing volumes
  loki_data:
    driver: local
  prometheus_data:
    driver: local
  grafana_data:
    driver: local
```

### Pre-Built Grafana Dashboards

8. **`monitoring/grafana/dashboards/sentinel-operations.json`** (~800 lines)

   **Panels**:
   - Request Rate (time series) - by method, endpoint
   - Error Rate (time series) - by module
   - Response Time Percentiles (p50, p95, p99)
   - Status Code Distribution (2xx, 4xx, 5xx)
   - Top 10 Slowest Endpoints (table)
   - Recent Errors (logs panel)
   - Active Users (stat)
   - Memory Usage (gauge from Prometheus)
   - CPU Usage (gauge from Prometheus)

9. **`monitoring/grafana/dashboards/sentinel-auth.json`** (~500 lines)

   **Panels**:
   - Login Attempts (time series - success vs failed)
   - API Key Usage (time series by apiKeyId)
   - Failed Auth by IP (table - top 10)
   - Session Activity (time series)
   - Recent Auth Events (logs panel)

10. **`monitoring/grafana/dashboards/sentinel-database.json`** (~400 lines)

    **Panels**:
    - Query Duration p95 (time series)
    - Slow Queries (table - >100ms)
    - Query Rate by Operation (time series)
    - Connection Pool Stats (from Prometheus)

11. **`monitoring/grafana/dashboards/sentinel-tracing.json`** (~300 lines)

    **Features**:
    - Variable input for correlation ID
    - All logs for correlation ID (chronological)
    - Timeline visualization
    - Module breakdown (api → db → service)

### Environment Variables

12. **`.env.example`** (MODIFY)

    Add monitoring section:

    ```bash
    # Monitoring Stack (optional - requires --profile monitoring)
    GRAFANA_ADMIN_PASSWORD=  # Auto-generated on first run
    LOKI_RETENTION_PERIOD=720h  # 30 days
    PROMETHEUS_RETENTION=15d
    ```

### Installation Steps

```bash
# 1. Create directory structure
mkdir -p monitoring/{loki,promtail,prometheus,grafana/{provisioning/{datasources,dashboards},dashboards}}

# 2. Create all configuration files (see detailed configs above)

# 3. Update docker-compose.yml with new services

# 4. Update .env.example

# 5. Generate strong Grafana password
echo "GRAFANA_ADMIN_PASSWORD=$(openssl rand -base64 32)" >> .env.local

# 6. Start monitoring stack
docker-compose --profile monitoring up -d

# 7. Wait for services to be healthy
docker-compose ps

# 8. Access Grafana
open http://localhost:3001
# Login: admin / <GRAFANA_ADMIN_PASSWORD>
```

### Verification Checklist

- [ ] Loki health check passes: `curl http://localhost:3100/ready`
- [ ] Promtail targets show backend: `curl http://localhost:9080/targets`
- [ ] Prometheus scraping backend: `curl http://localhost:9090/targets`
- [ ] Grafana accessible at http://localhost:3001
- [ ] Loki datasource connected in Grafana
- [ ] Prometheus datasource connected in Grafana
- [ ] All 4 dashboards load without errors
- [ ] Logs appear in Grafana Explore
- [ ] Metrics appear in Grafana Explore
- [ ] Correlation ID search works
- [ ] Dashboards show live data

### Common LogQL Queries

```logql
# All logs for correlation ID
{service="sentinel-backend"} |= "abc123" | json

# All 500 errors
{service="sentinel-backend", statusCode="500"} | json

# Slow requests (>500ms)
{service="sentinel-backend", module="api"} |= "HTTP Request" | json | duration > 500

# Auth failures
{service="sentinel-backend", module="auth", level="error"} | json

# Error rate per minute
sum(rate({service="sentinel-backend", level="error"}[1m]))
```

### Common PromQL Queries

```promql
# Request rate (requests/sec)
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m])

# p95 latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Memory usage
process_resident_memory_bytes

# Active database connections
database_connections_active
```

---

## Phase 4: Sentry Integration

### Objective

Add error tracking with Sentry for production error monitoring and alerting.

### Files to Create

1. **`apps/backend/src/lib/sentry.ts`** (NEW - ~180 lines)

   **Functions**:
   - `initializeSentry()` - Initialize before app import
   - `isSentryEnabled()` - Check if DSN configured
   - `setSentryUser()` - Set user context
   - `clearSentryUser()` - Clear user context
   - `setSentryCorrelationId()` - Add correlation ID tag
   - `addSentryBreadcrumb()` - Add breadcrumb
   - `captureException()` - Capture error with context
   - `captureMessage()` - Capture message

   **Configuration**:
   - Environment from `NODE_ENV`
   - Sample rates: 100% errors, 10% traces (development: 100%)
   - Auto-disabled in test environment
   - Security filters (no passwords, tokens, API keys)
   - Only captures 5xx errors (not 4xx client errors)

### Files to Modify

2. **`apps/backend/src/index.ts`** (MODIFY)

   **Critical**: Initialize Sentry BEFORE app import

   ```typescript
   import "dotenv/config";

   // MUST be first - instruments module loading
   import { initializeSentry } from "./lib/sentry.js";
   const sentryEnabled = initializeSentry();

   // NOW safe to import app
   import { createApp } from "./app.js";
   // ... rest
   ```

   Update error handlers to capture to Sentry:
   - `uncaughtException` handler
   - `unhandledRejection` handler
   - Main startup error handler

3. **`apps/backend/src/app.ts`** (MODIFY)

   Add Sentry middleware:

   ```typescript
   import { Sentry, isSentryEnabled } from "./lib/sentry.js";

   // Position 2-3 (after helmet, before body parsing)
   if (isSentryEnabled()) {
     app.use(Sentry.Handlers.requestHandler());
     app.use(Sentry.Handlers.tracingHandler());
   }

   // ... routes ...

   // Position 15 (before app error handler)
   if (isSentryEnabled()) {
     app.use(
       Sentry.Handlers.errorHandler({
         shouldHandleError(error) {
           // Only 5xx errors
           return error instanceof AppError ? error.statusCode >= 500 : true;
         },
       }),
     );
   }
   ```

4. **`apps/backend/src/middleware/request-logger.ts`** (MODIFY)

   Add correlation ID to Sentry context:

   ```typescript
   import { setSentryCorrelationId } from "../lib/sentry.js";

   requestContext.run({ correlationId }, () => {
     setSentryCorrelationId(correlationId); // NEW
     // ... rest of middleware
   });
   ```

5. **`apps/backend/src/middleware/error-handler.ts`** (MODIFY)

   Capture errors to Sentry:

   ```typescript
   import { captureException, addSentryBreadcrumb } from '../lib/sentry.js'

   // For 5xx errors
   if (appError.statusCode >= 500) {
     addSentryBreadcrumb('Server error', 'error', 'error', { ... })
     captureException(err, {
       statusCode: appError.statusCode,
       errorCode: appError.code,
       correlationId,
       // ...
     })
   }

   // Winston logging continues (complementary)
   logger.error('Server error', { ... })
   ```

6. **`apps/backend/src/middleware/auth.ts`** (MODIFY or CREATE if missing)

   Set user context in Sentry when authenticated:

   ```typescript
   import { setSentryUser } from "../lib/sentry.js";

   // After successful session auth
   setSentryUser(session.user.id, {
     email: session.user.email,
     username: session.user.name,
     role: session.user.role,
   });

   // After successful API key auth
   setSentryUser(apiKey.id, {
     apiKeyId: apiKey.id,
     username: apiKey.name,
     role: "api-key",
   });
   ```

7. **`apps/backend/src/lib/logger.ts`** (MODIFY)

   Bridge Winston warn/error logs to Sentry breadcrumbs:

   ```typescript
   import { addSentryBreadcrumb } from "./sentry.js";

   const correlationIdFormat = winston.format((info) => {
     // ... existing correlation ID logic

     // NEW: Add to Sentry breadcrumbs
     if (info.level === "warn" || info.level === "error") {
       addSentryBreadcrumb(
         info.message as string,
         (info.module as string) || "app",
         info.level === "error" ? "error" : "warning",
         { ...info },
       );
     }

     return info;
   });
   ```

8. **`apps/backend/vitest.config.ts`** (MODIFY)

   Ensure Sentry disabled in tests:

   ```typescript
   env: {
     NODE_ENV: 'test',
     SENTRY_DSN: undefined,  // Explicitly disable
   }
   ```

9. **`apps/backend/package.json`** (MODIFY)

   Add dependencies:

   ```json
   {
     "dependencies": {
       "@sentry/node": "^8.48.0",
       "@sentry/profiling-node": "^8.48.0"
     }
   }
   ```

10. **`.env.example`** (MODIFY)

    Add Sentry configuration:

    ```bash
    # Sentry Error Tracking (optional)
    SENTRY_DSN=
    SENTRY_ENVIRONMENT=development
    SENTRY_SAMPLE_RATE=1.0  # 100% errors
    SENTRY_TRACES_SAMPLE_RATE=1.0  # 100% traces in dev (0.1 for prod)
    ```

### Installation Steps

```bash
# 1. Install Sentry SDK
pnpm add @sentry/node @sentry/profiling-node --filter @sentinel/backend

# 2. Create Sentry project at https://sentry.io
#    - Select "Node.js" platform
#    - Copy DSN

# 3. Add to .env.local
cat >> .env.local << EOF
SENTRY_DSN="https://<key>@<org>.ingest.sentry.io/<project>"
SENTRY_ENVIRONMENT="development"
SENTRY_SAMPLE_RATE="1.0"
SENTRY_TRACES_SAMPLE_RATE="1.0"
EOF

# 4. Create sentry.ts file
# 5. Update all files listed above
# 6. Restart backend
pnpm dev

# 7. Verify initialization
# Look for: "Sentry initialized" in logs

# 8. Test error capture
curl http://localhost:3000/api/nonexistent  # 404 - should NOT go to Sentry
# Trigger a 500 error - should appear in Sentry dashboard
```

### Verification Checklist

- [ ] Sentry initializes without errors
- [ ] Sentry disabled when `NODE_ENV=test`
- [ ] 5xx errors captured to Sentry
- [ ] 4xx errors NOT captured to Sentry
- [ ] Correlation IDs appear in Sentry events
- [ ] User context set when authenticated (userId/email)
- [ ] API key context set (apiKeyId)
- [ ] Sensitive data filtered (no passwords/tokens)
- [ ] Winston logging still works (complementary)
- [ ] Breadcrumbs show event trail
- [ ] Performance transactions captured
- [ ] Graceful degradation (works without SENTRY_DSN)

---

## Integration Testing

### End-to-End Verification

After implementing all phases, verify the complete stack:

### 1. Start Everything

```bash
# Start core services + monitoring
docker-compose --profile backend --profile monitoring up -d

# Wait for health checks
docker-compose ps

# Check logs
docker-compose logs -f backend
```

### 2. Access All Services

| Service     | URL                         | Credentials                    |
| ----------- | --------------------------- | ------------------------------ |
| Backend API | http://localhost:3000       | -                              |
| Swagger UI  | http://localhost:3000/docs  | -                              |
| ReDoc       | http://localhost:3000/redoc | -                              |
| Grafana     | http://localhost:3001       | admin / GRAFANA_ADMIN_PASSWORD |
| Prometheus  | http://localhost:9090       | -                              |
| Sentry      | https://sentry.io           | (external)                     |

### 3. Generate Test Traffic

```bash
# Generate API requests
for i in {1..100}; do
  curl -s http://localhost:3000/api/members > /dev/null
  curl -s http://localhost:3000/api/badges > /dev/null
  curl -s http://localhost:3000/api/divisions > /dev/null
  sleep 0.1
done

# Trigger 404 error
curl http://localhost:3000/api/nonexistent

# Trigger auth failure (if auth required)
curl -H "Authorization: Bearer invalid" http://localhost:3000/api/members
```

### 4. Verify Each Component

**Swagger UI**:

- [ ] Open http://localhost:3000/docs
- [ ] All endpoints visible
- [ ] "Try it out" works for GET requests
- [ ] Authentication supported

**Prometheus Metrics**:

- [ ] Open http://localhost:3000/metrics
- [ ] See `http_requests_total` counter
- [ ] See `http_request_duration_seconds` histogram
- [ ] See custom business metrics

**Grafana - Operations Dashboard**:

- [ ] Open http://localhost:3001
- [ ] Login with admin credentials
- [ ] Navigate to "Operations" dashboard
- [ ] See request rate graph with data
- [ ] See response time percentiles
- [ ] See status code distribution
- [ ] Logs panel shows recent requests

**Grafana - Explore Logs (Loki)**:

- [ ] Click "Explore" in sidebar
- [ ] Select "Loki" datasource
- [ ] Query: `{service="sentinel-backend"}`
- [ ] See logs with proper formatting
- [ ] Filter by level (error, warn, info)
- [ ] Filter by module (api, db, auth)
- [ ] Click correlation ID → shows all related logs

**Grafana - Explore Metrics (Prometheus)**:

- [ ] Click "Explore" in sidebar
- [ ] Select "Prometheus" datasource
- [ ] Query: `rate(http_requests_total[5m])`
- [ ] See metrics graph
- [ ] Query: `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))`
- [ ] See p95 latency

**Sentry** (if enabled):

- [ ] Open Sentry dashboard
- [ ] See project for Sentinel
- [ ] Trigger 500 error in backend
- [ ] Error appears in Sentry within 30 seconds
- [ ] Event includes correlation ID
- [ ] Event includes user context (if authenticated)
- [ ] Breadcrumbs show event trail
- [ ] Stack trace visible

### 5. Correlation ID Tracing

```bash
# Make request and capture correlation ID
RESPONSE=$(curl -v http://localhost:3000/api/members 2>&1)
CORRELATION_ID=$(echo "$RESPONSE" | grep -i "X-Correlation-ID" | awk '{print $3}' | tr -d '\r')

echo "Correlation ID: $CORRELATION_ID"

# Search in Grafana
# Navigate to Grafana → Explore → Loki
# Query: {service="sentinel-backend"} |= "$CORRELATION_ID"
# Should show all logs for that request (api → db → response)
```

### 6. Performance Check

Verify monitoring has minimal overhead:

```bash
# Benchmark without monitoring
docker-compose --profile backend up -d
ab -n 1000 -c 10 http://localhost:3000/api/health

# Benchmark with monitoring
docker-compose --profile backend --profile monitoring up -d
ab -n 1000 -c 10 http://localhost:3000/api/health

# Compare results - should be <10% difference
```

---

## Resource Requirements

### Development Environment

**Minimum**:

- 8GB RAM
- 20GB disk space
- 4 CPU cores

**Resource Usage**:

- Backend: ~200MB RAM
- PostgreSQL: ~100MB RAM
- Redis: ~50MB RAM
- Prometheus: ~150MB RAM, ~500MB disk
- Loki: ~200MB RAM, ~1GB disk
- Promtail: ~50MB RAM
- Grafana: ~200MB RAM, ~100MB disk
- **Total**: ~950MB RAM, ~2GB disk

### Production Considerations

For production deployment (out of scope for this plan):

- Retention: 30 days logs, 90 days metrics
- High availability: 3-node Loki cluster
- External storage: S3 for Loki chunks
- Alerting: Grafana alerts → Slack/PagerDuty
- Authentication: OAuth/LDAP for Grafana
- HTTPS: Reverse proxy (Nginx/Caddy)
- Backups: Automated Grafana dashboard backups

---

## Troubleshooting Guide

### Swagger UI Issues

**Problem**: CSP blocking Swagger UI

- **Solution**: Check browser console for CSP violations. Add path-specific CSP for `/docs` if needed.

**Problem**: OpenAPI spec not found

- **Solution**: Run `pnpm openapi` to regenerate. Check `apps/backend/openapi.json` exists.

### Prometheus Issues

**Problem**: No metrics at `/metrics`

- **Solution**: Verify `prom-client` initialized in `metrics.ts`. Check middleware is mounted in `app.ts`.

**Problem**: Metrics not in Prometheus

- **Solution**: Check Prometheus scrape config targets backend service. Verify backend health endpoint accessible from Prometheus container: `docker exec sentinel-prometheus wget -O- http://backend:3000/metrics`

### Loki/Promtail Issues

**Problem**: No logs in Grafana

- **Solution**:
  1. Check Promtail logs: `docker logs sentinel-promtail`
  2. Verify Docker socket accessible: `ls -l /var/run/docker.sock`
  3. Check backend container running: `docker ps | grep backend`
  4. Verify JSON format in logs: `docker logs sentinel-backend | head`

**Problem**: Correlation IDs not searchable

- **Solution**: Check Promtail JSON parsing config. Ensure Winston includes correlationId field. Test LogQL: `{service="sentinel-backend"} | json | correlationId != ""`

### Grafana Issues

**Problem**: Can't login to Grafana

- **Solution**: Check password in `.env.local`. Reset: `docker exec -it sentinel-grafana grafana-cli admin reset-admin-password newpassword`

**Problem**: Datasource connection failed

- **Solution**: Verify services can communicate: `docker exec sentinel-grafana ping loki` and `docker exec sentinel-grafana ping prometheus`

**Problem**: Dashboards show "No data"

- **Solution**: Check time range (top right). Verify data in Explore first. Check datasource queries manually.

### Sentry Issues

**Problem**: Sentry not capturing errors

- **Solution**:
  1. Check `SENTRY_DSN` set in `.env.local`
  2. Verify initialization: Look for "Sentry initialized" in logs
  3. Check error is 5xx (not 4xx)
  4. Verify network: `curl https://sentry.io`

**Problem**: Sensitive data in Sentry

- **Solution**: Review `beforeSend` hook in `sentry.ts`. Add fields to filter list. Clear Sentry events and test again.

---

## Documentation Updates Required

After implementation, update these documentation files:

1. **`apps/backend/CLAUDE.md`**
   - Add Sentry, Prometheus, Grafana to technology stack
   - Document new environment variables
   - Update architecture diagram

2. **`apps/backend/src/middleware/CLAUDE.md`**
   - Document new middleware positions (Sentry, metrics)
   - Update middleware order table

3. **`docs/guides/reference/environment.md`**
   - Document all new environment variables with examples
   - Add Sentry setup instructions
   - Add Grafana admin password generation

4. **`docs/guides/reference/architecture.md`**
   - Add observability stack diagram
   - Document monitoring components
   - Explain log flow (Winston → Promtail → Loki → Grafana)

5. **`docs/guides/howto/howto-setup-monitoring.md`** (NEW)
   - Step-by-step monitoring setup guide
   - Dashboard usage examples
   - Common queries and filters

6. **`docs/guides/howto/howto-troubleshoot-logs.md`** (NEW)
   - LogQL query examples
   - Correlation ID tracing guide
   - Common debugging scenarios

7. **`README.md`** (if exists)
   - Add monitoring setup to quick start
   - Document Docker Compose profiles

---

## Critical Files Summary

### Tier 1 - Must Implement (Core Functionality)

1. `apps/backend/src/routes/swagger.ts` - Swagger UI hosting
2. `apps/backend/src/lib/metrics.ts` - Prometheus metrics
3. `apps/backend/src/lib/sentry.ts` - Sentry initialization
4. `monitoring/loki/loki-config.yml` - Loki configuration
5. `monitoring/promtail/promtail-config.yml` - Log shipping config
6. `monitoring/prometheus/prometheus.yml` - Metrics scraping
7. `monitoring/grafana/provisioning/datasources/loki.yml` - Loki datasource
8. `monitoring/grafana/provisioning/datasources/prometheus.yml` - Prometheus datasource
9. `docker-compose.yml` - Add all monitoring services

### Tier 2 - Must Modify (Integration Points)

10. `apps/backend/src/app.ts` - Mount Swagger routes, Sentry middleware, metrics middleware
11. `apps/backend/src/index.ts` - Initialize Sentry before app import
12. `apps/backend/src/middleware/error-handler.ts` - Capture errors to Sentry
13. `apps/backend/src/middleware/request-logger.ts` - Add correlation ID to Sentry
14. `apps/backend/src/routes/health.ts` - Convert metrics to Prometheus format
15. `apps/backend/package.json` - Add dependencies

### Tier 3 - Should Create (Enhanced Experience)

16. `apps/backend/src/middleware/swagger-auth.ts` - Conditional auth for docs
17. `apps/backend/src/middleware/metrics.ts` - Request metrics middleware
18. `monitoring/grafana/dashboards/sentinel-operations.json` - Main dashboard
19. `monitoring/grafana/dashboards/sentinel-auth.json` - Auth dashboard
20. `monitoring/grafana/dashboards/sentinel-database.json` - DB dashboard
21. `monitoring/grafana/dashboards/sentinel-tracing.json` - Correlation ID tracing
22. `.env.example` - Document all new variables

---

## Success Criteria

Implementation is complete when:

### Functionality

- [ ] Swagger UI loads at `/docs` with all 23 resource endpoints
- [ ] ReDoc loads at `/redoc` with clean reference documentation
- [ ] Prometheus metrics available at `/metrics` in correct format
- [ ] Grafana accessible at http://localhost:3001
- [ ] All 4 pre-built dashboards load and display live data
- [ ] Logs searchable in Grafana by correlation ID, level, module
- [ ] Sentry captures 5xx errors with full context
- [ ] Correlation ID tracing works end-to-end

### Performance

- [ ] API response time overhead <10ms (metrics middleware)
- [ ] Log shipping lag <5 seconds (Promtail → Loki)
- [ ] Grafana query response <2 seconds
- [ ] Total monitoring stack RAM usage <1GB

### Reliability

- [ ] All services have health checks
- [ ] Services auto-restart on failure
- [ ] Graceful degradation (backend works if monitoring down)
- [ ] Tests pass with monitoring enabled
- [ ] No data loss during backend restarts

### Security

- [ ] Grafana requires authentication
- [ ] Swagger docs authentication configurable
- [ ] Sensitive data filtered from Sentry
- [ ] Logs don't contain passwords/tokens
- [ ] Prometheus metrics don't expose secrets

### Usability

- [ ] Docker Compose profiles work (`--profile monitoring`)
- [ ] Environment variables documented
- [ ] Dashboard panels have descriptions
- [ ] Correlation IDs clickable in Grafana
- [ ] Common queries documented

---

## Rollback Strategy

### Immediate Rollback (Environment Variables)

**Disable components without code changes:**

```bash
# Disable Swagger UI
export ENABLE_SWAGGER_AUTH=disabled

# Disable Sentry (remove DSN)
unset SENTRY_DSN

# Stop monitoring stack
docker-compose --profile monitoring down
```

### Partial Rollback (Code)

**Phase-by-phase rollback:**

```bash
# Rollback Phase 4 (Sentry)
git checkout HEAD -- apps/backend/src/lib/sentry.ts
git checkout HEAD -- apps/backend/src/index.ts  # Remove Sentry init
# Update app.ts to remove Sentry middleware
pnpm build && docker-compose restart backend

# Rollback Phase 3 (Monitoring)
docker-compose --profile monitoring down
rm -rf monitoring/
git checkout HEAD -- docker-compose.yml
docker-compose restart

# Rollback Phase 2 (Prometheus)
git checkout HEAD -- apps/backend/src/lib/metrics.ts
git checkout HEAD -- apps/backend/src/routes/health.ts
# Update app.ts to remove metrics middleware
pnpm build && docker-compose restart backend

# Rollback Phase 1 (Swagger)
git checkout HEAD -- apps/backend/src/routes/swagger.ts
git checkout HEAD -- apps/backend/src/app.ts  # Remove Swagger routes
pnpm build && docker-compose restart backend
```

### Full Rollback

```bash
# Return to current state
git stash
git checkout <commit-before-implementation>
docker-compose down -v  # WARNING: Deletes all data
docker-compose up -d
```

---

## Timeline Estimate

### Phase 1: Swagger UI - 2-3 hours

- Install dependencies: 15 min
- Create swagger.ts router: 45 min
- Create swagger-auth.ts middleware: 30 min
- Update app.ts: 15 min
- Enhance generate-openapi.ts: 30 min
- Testing and verification: 45 min

### Phase 2: Prometheus Metrics - 2-3 hours

- Install prom-client: 5 min
- Create metrics.ts: 60 min
- Create metrics middleware: 30 min
- Update health.ts endpoint: 15 min
- Update app.ts: 10 min
- Testing and verification: 40 min

### Phase 3: Grafana + Loki + Prometheus - 3-4 hours

- Create directory structure: 10 min
- Create Loki config: 20 min
- Create Promtail config: 30 min
- Create Prometheus config: 15 min
- Create Grafana provisioning: 20 min
- Create dashboards: 90 min (complex)
- Update docker-compose.yml: 20 min
- Testing and verification: 60 min

### Phase 4: Sentry Integration - 2-3 hours

- Install Sentry SDK: 5 min
- Create sentry.ts: 45 min
- Update index.ts: 15 min
- Update app.ts: 20 min
- Update error-handler.ts: 20 min
- Update request-logger.ts: 10 min
- Update auth middleware: 15 min (if exists)
- Update logger.ts: 15 min
- Testing and verification: 40 min

### Integration & Documentation - 2 hours

- End-to-end testing: 60 min
- Documentation updates: 60 min

**Total: 11-14 hours** (1.5-2 working days)

---

## Next Steps

After plan approval:

1. Create feature branch: `git checkout -b feature/complete-observability-stack`
2. Implement Phase 1 (Swagger UI)
3. Commit and test Phase 1
4. Implement Phase 2 (Prometheus)
5. Commit and test Phase 2
6. Implement Phase 3 (Grafana + Loki)
7. Commit and test Phase 3
8. Implement Phase 4 (Sentry)
9. Commit and test Phase 4
10. End-to-end integration testing
11. Update documentation
12. Create PR to `rebuild` branch
13. Code review
14. Merge and deploy

---

## User Preferences Confirmed

Configuration decisions made:

- [x] **Sentry**: Deferred - skip for now, can add later
- [x] **Grafana password**: Auto-generate strong random password
- [x] **Custom metrics**: All business metrics (badges, check-ins, visitors, events, DDS, alerts, DB pool)
- [x] **Log retention**: 30 days (production-ready)
- [x] **Timeline**: Development focus with production-ready patterns

---

This plan provides a complete roadmap for implementing all four observability components with detailed instructions, configurations, and verification steps. The phased approach allows for incremental implementation and testing.
