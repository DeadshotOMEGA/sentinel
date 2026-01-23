---
type: howto
title: "How to Test the Observability Stack"
status: published
created: 2026-01-22
last_updated: 2026-01-22
ai:
  priority: high
  context_load: on-demand
  triggers:
    - observability
    - testing
    - monitoring
    - grafana
    - prometheus
  token_budget: 2000
---

# How to Test the Observability Stack

Step-by-step guide to test the complete observability stack implementation for Sentinel.

## Prerequisites

- Docker and Docker Compose installed
- All monitoring configuration files in place (monitoring/ directory)
- Backend application built and ready to run

## Step 1: Start the Monitoring Stack

Start all services with the monitoring profile:

```bash
# Start backend + monitoring services
docker compose --profile backend --profile monitoring up -d

# Wait for all services to be healthy (30-60 seconds)
docker compose ps

# Expected output: All services should show "healthy" or "Up"
```

**Services Started**:
- sentinel-postgres (database)
- sentinel-redis (cache)
- sentinel-backend (API server)
- sentinel-loki (log aggregation)
- sentinel-promtail (log shipper)
- sentinel-prometheus (metrics collection)
- sentinel-grafana (visualization)

## Step 2: Verify Service Health

Check each service is running correctly:

```bash
# Check all container status
docker compose ps

# Check Loki health
curl http://localhost:3100/ready
# Expected: "ready"

# Check Prometheus health
curl http://localhost:9090/-/healthy
# Expected: "Prometheus is Healthy."

# Check Grafana health
curl http://localhost:3001/api/health
# Expected: {"commit":"...", "database":"ok", ...}

# Check backend health
curl http://localhost:3000/api/health
# Expected: {"status":"ok", "database":"connected", ...}
```

## Step 3: Test Swagger UI

Open your browser and test the API documentation:

**Swagger UI**: http://localhost:3000/docs

**Checklist**:
- [ ] Page loads without errors
- [ ] All 23 resource endpoints visible
- [ ] Schemas section shows all models
- [ ] Click "Authorize" button works (if auth enabled)
- [ ] "Try it out" works for GET /api/health
- [ ] Response shows proper JSON format
- [ ] No Content Security Policy (CSP) violations in browser console

**ReDoc**: http://localhost:3000/redoc

**Checklist**:
- [ ] Page loads with clean layout
- [ ] Left sidebar shows all endpoints
- [ ] Right panel shows request/response schemas
- [ ] Search functionality works

**OpenAPI Spec**: http://localhost:3000/openapi.json

**Checklist**:
- [ ] Returns valid JSON
- [ ] Contains "openapi": "3.0.2"
- [ ] All 23 resources documented

## Step 4: Test Prometheus Metrics

Check the metrics endpoint:

```bash
# Get raw metrics
curl http://localhost:3000/metrics

# Expected output includes:
# - # HELP http_requests_total Total HTTP requests
# - # TYPE http_requests_total counter
# - http_requests_total{method="GET",path="/api/health",status="200"} 1
# - # HELP http_request_duration_seconds HTTP request duration
# - # HELP nodejs_heap_size_total_bytes Total heap size
```

**Checklist**:
- [ ] Endpoint returns Prometheus text format
- [ ] HTTP metrics present (requests_total, request_duration_seconds)
- [ ] Database metrics present (query_duration_seconds, pool_size)
- [ ] Auth metrics present (attempts_total, active_sessions)
- [ ] Business metrics present (checkins_total, badge_operations_total, etc.)
- [ ] Node.js default metrics present (memory, CPU, event loop)

**Open Prometheus UI**: http://localhost:9090

**Checklist**:
- [ ] UI loads successfully
- [ ] Navigate to Status → Targets
- [ ] "sentinel-backend" target shows "UP" status
- [ ] Last scrape shows recent timestamp
- [ ] No scrape errors

**Test a Query**:
1. Go to Graph tab
2. Enter query: `rate(http_requests_total[5m])`
3. Click "Execute"
4. Should see graph with request rate data

## Step 5: Generate Test Traffic

Generate API requests to populate metrics and logs:

```bash
# Generate 100 test requests
for i in {1..100}; do
  curl -s http://localhost:3000/api/health > /dev/null
  sleep 0.1
done

# Test different endpoints
curl http://localhost:3000/api/members
curl http://localhost:3000/api/badges
curl http://localhost:3000/api/divisions

# Trigger a 404 error
curl http://localhost:3000/api/nonexistent

# View backend logs
docker compose logs -f backend | head -50
```

**Checklist**:
- [ ] Backend logs show JSON format
- [ ] Each log entry includes correlationId
- [ ] Each log entry includes module field
- [ ] HTTP requests logged with method, path, duration
- [ ] Correlation IDs are UUIDs

## Step 6: Test Grafana Dashboards

**Open Grafana**: http://localhost:3001

**Login**:
- Username: `admin`
- Password: Check `.env.local` for `GRAFANA_ADMIN_PASSWORD`
  - If not set, default is `changeme`

### 6.1 Verify Datasources

1. Navigate to **Connections → Data sources** (gear icon → Data sources)
2. Click "Loki"
   - [ ] Status shows green "Data source is working"
   - [ ] URL: http://loki:3100
3. Click "Prometheus"
   - [ ] Status shows green "Data source is working"
   - [ ] URL: http://prometheus:9090

### 6.2 Test Operations Dashboard

1. Navigate to **Dashboards** (four squares icon)
2. Open "Sentinel Operations Dashboard"

**Checklist**:
- [ ] Dashboard loads without errors
- [ ] "Request Rate" panel shows data (line graph)
- [ ] "Error Rate" panel exists (should be 0 or low)
- [ ] "Response Time Percentiles" shows p50, p95, p99
- [ ] "Status Code Distribution" shows 2xx responses
- [ ] "Recent Errors" log panel (may be empty if no errors)
- [ ] Time range selector works (top right)

### 6.3 Test Auth Dashboard

Open "Sentinel Authentication Dashboard"

**Checklist**:
- [ ] Dashboard loads
- [ ] Panels show "No data" or actual data (depending on auth activity)
- [ ] Structure is correct (login attempts, API key usage, etc.)

### 6.4 Test Database Dashboard

Open "Sentinel Database Dashboard"

**Checklist**:
- [ ] Dashboard loads
- [ ] Query duration panels exist
- [ ] Connection pool stats available

### 6.5 Test Tracing Dashboard

Open "Sentinel Tracing Dashboard"

**Checklist**:
- [ ] Dashboard loads
- [ ] "Correlation ID" variable input at top
- [ ] Empty state shows "Enter correlation ID to trace request"

## Step 7: Test Loki Log Aggregation

### 7.1 Verify Logs in Grafana Explore

1. Click **Explore** (compass icon in left sidebar)
2. Select **Loki** datasource (dropdown at top)
3. Enter query: `{service="sentinel-backend"}`
4. Click "Run query"

**Checklist**:
- [ ] Logs appear in results
- [ ] Logs are in JSON format
- [ ] Click "Expand" on a log entry
- [ ] Fields visible: level, module, correlationId, message, timestamp
- [ ] Timestamp is recent

### 7.2 Test Log Filtering

Try these LogQL queries:

```logql
# All error logs
{service="sentinel-backend", level="error"} | json

# All API logs
{service="sentinel-backend", module="api"} | json

# Logs containing specific text
{service="sentinel-backend"} |= "HTTP Request" | json

# Error rate (last 5 minutes)
sum(rate({service="sentinel-backend", level="error"}[5m]))
```

**Checklist**:
- [ ] Each query returns relevant results
- [ ] Filtering by level works
- [ ] Filtering by module works
- [ ] Text search works
- [ ] Aggregation query returns numeric result

## Step 8: Test Correlation ID Tracing

### 8.1 Capture a Correlation ID

```bash
# Make request and capture correlation ID from header
RESPONSE=$(curl -v http://localhost:3000/api/health 2>&1)
CORRELATION_ID=$(echo "$RESPONSE" | grep -i "X-Correlation-ID" | awk '{print $3}' | tr -d '\r')

echo "Correlation ID: $CORRELATION_ID"
```

### 8.2 Search in Grafana

1. Go to **Grafana → Explore → Loki**
2. Enter query: `{service="sentinel-backend"} |= "<paste-correlation-id>" | json`
3. Click "Run query"

**Checklist**:
- [ ] All logs for that request appear
- [ ] Logs show request flow (api → service → db → response)
- [ ] Logs are in chronological order
- [ ] Each log has the same correlationId field

### 8.3 Test Tracing Dashboard

1. Go to **Sentinel Tracing Dashboard**
2. Enter correlation ID in variable input at top
3. Press Enter or click away to trigger query

**Checklist**:
- [ ] Logs for that correlation ID appear
- [ ] Timeline shows request flow
- [ ] Module breakdown shows which components were involved

## Step 9: Test Prometheus Queries

Open **Grafana → Explore → Prometheus**

Try these PromQL queries:

```promql
# Request rate (requests per second)
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m])

# p95 latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Memory usage
process_resident_memory_bytes

# Active database connections
database_pool_size
```

**Checklist**:
- [ ] Each query returns data
- [ ] Graphs show trends
- [ ] No "No data" errors (except for error rate if no errors)

## Step 10: Performance Check

Verify monitoring has minimal overhead:

```bash
# Benchmark without looking at results (baseline)
time for i in {1..1000}; do curl -s http://localhost:3000/api/health > /dev/null; done

# Check CPU usage
docker stats --no-stream | grep sentinel

# Check memory usage
docker stats --no-stream | grep sentinel | awk '{print $1, $3, $7}'
```

**Expected**:
- Backend: ~200MB RAM, <10% CPU (idle)
- Prometheus: ~150MB RAM
- Loki: ~200MB RAM
- Grafana: ~200MB RAM
- Total: <1GB RAM

**Checklist**:
- [ ] Backend response time <10ms per request
- [ ] Total memory usage <1GB
- [ ] CPU usage reasonable (<50% under load)
- [ ] No container restarts (check `docker compose ps`)

## Step 11: Test Error Scenarios

### 11.1 Trigger and Track an Error

```bash
# Trigger 404 error
curl http://localhost:3000/api/invalid-endpoint

# Check logs immediately
docker compose logs backend | tail -20

# Search in Grafana
# Query: {service="sentinel-backend", level="error"} | json
```

**Checklist**:
- [ ] 404 error appears in logs
- [ ] Error logged with correlation ID
- [ ] Error appears in Grafana Loki
- [ ] Error appears in Operations Dashboard "Recent Errors" panel
- [ ] Error metric increments in Prometheus

## Step 12: Verify Data Retention

Check retention policies are working:

```bash
# Check Loki config
docker compose exec loki cat /etc/loki/local-config.yaml | grep retention

# Check Prometheus config
docker compose exec prometheus cat /etc/prometheus/prometheus.yml | grep retention
```

**Expected**:
- Loki: 30 days (720h) retention
- Prometheus: 15 days retention

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker compose logs <service-name>

# Common issues:
# - Port already in use: Change port in docker-compose.yml
# - Permission denied: Check volume mount permissions
# - Health check failing: Wait longer (60s) or check config
```

### No Logs in Loki

```bash
# Check Promtail is running
docker compose ps promtail

# Check Promtail logs
docker compose logs promtail

# Check Docker socket permission
ls -l /var/run/docker.sock

# Restart Promtail
docker compose restart promtail
```

### No Metrics in Prometheus

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Check backend is accessible from Prometheus
docker compose exec prometheus wget -O- http://backend:3000/metrics

# Check backend metrics endpoint directly
curl http://localhost:3000/metrics
```

### Grafana Datasource Connection Failed

```bash
# Check services can communicate
docker compose exec grafana ping loki
docker compose exec grafana ping prometheus

# Check network
docker network ls | grep sentinel
docker network inspect sentinel-network
```

### High Memory Usage

```bash
# Reduce Loki retention (edit monitoring/loki/loki-config.yml)
# Change: retention_period: 168h  # 7 days instead of 30

# Reduce Prometheus retention
# Edit docker-compose.yml, change:
# --storage.tsdb.retention.time=7d  # Instead of 15d

# Restart services
docker compose --profile monitoring down
docker compose --profile monitoring up -d
```

## Success Criteria

All tests pass when:

- [ ] All services start and show "healthy" status
- [ ] Swagger UI loads with all 23 endpoints
- [ ] Prometheus metrics endpoint returns data
- [ ] Grafana loads all 4 dashboards without errors
- [ ] Loki aggregates logs from backend
- [ ] Correlation ID tracing works end-to-end
- [ ] All datasources show "working" status in Grafana
- [ ] Test traffic appears in metrics and logs
- [ ] Performance overhead <10% (response time)
- [ ] Total monitoring stack uses <1GB RAM

## Cleanup

After testing:

```bash
# Stop monitoring stack (keep data)
docker compose --profile monitoring down

# Stop everything and remove volumes (lose data)
docker compose --profile backend --profile monitoring down -v

# Remove only monitoring volumes
docker volume rm sentinel_loki_data sentinel_prometheus_data sentinel_grafana_data
```

## Next Steps

Once all tests pass:

1. Update [implementation plan](../../plans/active/2026-01-22-observability-stack-implementation.md) with results
2. Document any issues or configuration changes
3. Create PR to `rebuild` branch
4. Request code review

## Related Documentation

- [Implementation Plan](../../plans/active/2026-01-22-observability-stack-implementation.md)
- [Architecture Reference](../reference/architecture.md)
- [Environment Variables](../reference/environment.md)
