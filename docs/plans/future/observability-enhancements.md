---
type: plan
title: 'Sentinel Observability Stack - Future Enhancements'
status: future
created: 2026-01-23
last_updated: 2026-01-23
lifecycle: future
priority: medium
estimated_effort: 2-3 weeks
depends_on:
  - docs/plans/completed/2026-01-22-observability-stack-implementation.md
ai:
  priority: medium
  context_load: on-demand
  triggers:
    - sentry
    - alerting
    - opentelemetry
    - tracing
    - monitoring enhancements
  token_budget: 3000
related_code:
  - apps/backend/src/lib/
  - apps/backend/src/middleware/
  - monitoring/
---

# Future Plan: Observability Stack Enhancements

## Executive Summary

This plan outlines future enhancements to the Sentinel observability stack, building on the completed implementation of Swagger UI, Prometheus metrics, and Grafana + Loki + Promtail.

**Status**: Future work - to be scheduled
**Dependencies**: Requires completed observability stack (Phase 1-3)
**Estimated Timeline**: 2-3 weeks total effort

## Deferred from Phase 1-3

### Phase 4: Sentry Integration (HIGH PRIORITY)

**Status**: Deferred from initial implementation
**Effort**: 2-3 days
**Value**: Production error tracking with full context

**Why Deferred**:

- Core observability stack (logs, metrics, dashboards) prioritized first
- Sentry requires external service setup and account
- Complete implementation instructions already documented in original plan

**When to Implement**:

- Before production deployment
- When error alerting becomes critical
- When team has Sentry account configured

**Implementation Guide**: See Phase 4 section in `docs/plans/completed/2026-01-22-observability-stack-implementation.md`

**Key Features**:

- Error tracking with full stack traces
- User context (userId, email, role)
- Correlation ID integration
- Breadcrumb trail from Winston logs
- Only captures 5xx errors (not 4xx client errors)
- Automatic source maps support
- Performance monitoring (optional)

**Dependencies**:

```json
{
  "@sentry/node": "^8.48.0",
  "@sentry/profiling-node": "^8.48.0"
}
```

---

## Additional Enhancements

### 1. Grafana Alerting Rules (MEDIUM PRIORITY)

**Effort**: 1-2 days
**Value**: Proactive issue detection

**Objectives**:

- Configure alert rules for critical conditions
- Set up notification channels (Slack, email, PagerDuty)
- Define escalation policies

**Alert Rules to Implement**:

**Critical Alerts**:

- Backend service down (no metrics for 2 minutes)
- Error rate > 5% for 5 minutes
- Database connection pool exhausted
- Memory usage > 90% for 10 minutes
- Response time p95 > 2 seconds for 5 minutes

**Warning Alerts**:

- Error rate > 2% for 5 minutes
- Slow queries (> 500ms) count increasing
- Failed authentication attempts spike
- Disk space < 20%
- Log ingestion delayed > 30 seconds

**Configuration Files**:

```
monitoring/grafana/provisioning/alerting/
├── alert-rules.yml
├── notification-policies.yml
└── contact-points.yml
```

**Example Alert Rule** (Prometheus):

```yaml
groups:
  - name: sentinel_critical
    interval: 1m
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: 'High error rate detected'
          description: 'Error rate is {{ $value | humanizePercentage }} (threshold: 5%)'
```

**Notification Channels**:

- Slack: #alerts channel
- Email: ops-team@sentinel.local
- PagerDuty: On-call rotation (production only)

---

### 2. Distributed Tracing with OpenTelemetry (HIGH VALUE)

**Effort**: 3-4 days
**Value**: End-to-end request tracing across services

**Objectives**:

- Track requests across multiple services
- Identify performance bottlenecks
- Correlate logs, metrics, and traces

**Stack**:

- **OpenTelemetry SDK**: Instrumentation
- **Jaeger**: Trace storage and visualization
- **Grafana Tempo**: Alternative to Jaeger (integrates with existing Grafana)

**Recommended**: Use Grafana Tempo for unified Grafana experience

**Implementation Steps**:

1. **Install OpenTelemetry SDK**:

```bash
pnpm add @opentelemetry/api \
         @opentelemetry/sdk-node \
         @opentelemetry/auto-instrumentations-node \
         @opentelemetry/exporter-trace-otlp-http
```

2. **Add Tempo to docker-compose.yml**:

```yaml
tempo:
  image: grafana/tempo:2.3.1
  container_name: sentinel-tempo
  ports:
    - '3200:3200' # Tempo HTTP
    - '4317:4317' # OTLP gRPC
    - '4318:4318' # OTLP HTTP
  volumes:
    - ./monitoring/tempo/tempo.yml:/etc/tempo.yaml:ro
    - tempo_data:/tmp/tempo
  command: -config.file=/etc/tempo.yaml
  profiles:
    - monitoring
```

3. **Configure OpenTelemetry** (`apps/backend/src/lib/tracing.ts`):

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'

export function initializeTracing() {
  const sdk = new NodeSDK({
    traceExporter: new OTLPTraceExporter({
      url: 'http://tempo:4318/v1/traces',
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
    serviceName: 'sentinel-backend',
  })

  sdk.start()

  process.on('SIGTERM', () => sdk.shutdown())
}
```

4. **Add Tempo datasource to Grafana**:

```yaml
# monitoring/grafana/provisioning/datasources/tempo.yml
apiVersion: 1
datasources:
  - name: Tempo
    type: tempo
    access: proxy
    url: http://tempo:3200
    jsonData:
      tracesToLogs:
        datasourceUid: loki
        tags: ['correlationId']
```

5. **Link Traces to Logs**:

- Correlation ID already present in logs
- Configure Tempo → Loki linking
- Click trace span → see related logs

**Benefits**:

- Visualize request flow across services
- Identify slow database queries
- Debug complex distributed operations
- Performance profiling

---

### 3. Advanced Dashboards (MEDIUM PRIORITY)

**Effort**: 2-3 days
**Value**: Better insights and visualization

**New Dashboards to Create**:

**1. Business Metrics Dashboard**:

- Daily/weekly active members
- Check-in trends by day/time
- Badge utilization rates
- Visitor patterns
- Event attendance statistics
- DDS assignment trends

**2. Performance Dashboard**:

- Response time heatmaps
- Slow endpoint analysis
- Database query performance
- Memory and CPU trends
- Request rate by endpoint

**3. Security Dashboard**:

- Failed authentication attempts by IP
- API key usage patterns
- Security alert timeline
- Unauthorized access attempts
- Rate limit hits

**4. Infrastructure Dashboard**:

- Container health status
- Docker resource usage
- Network traffic
- Volume usage
- Service uptime SLAs

**5. User Experience Dashboard**:

- Apdex scores (Application Performance Index)
- User journey funnels
- Error impact on users
- Session duration trends

---

### 4. Log Retention Policies (LOW PRIORITY)

**Effort**: 1 day
**Value**: Cost optimization and compliance

**Current State**:

- Loki: 30 days retention (720h)
- Prometheus: 15 days retention

**Production Recommendations**:

**Hot Storage** (Fast, Expensive):

- Last 7 days: Full logs with all labels
- High query performance
- Local SSD storage

**Warm Storage** (Medium Speed/Cost):

- 8-30 days: Logs with reduced cardinality
- Aggregated metrics only
- Network-attached storage

**Cold Storage** (Slow, Cheap):

- 31-90 days: Compressed logs
- Compliance/audit purposes only
- S3/object storage

**Implementation**:

```yaml
# monitoring/loki/loki-config.yml
limits_config:
  retention_period: 720h # 30 days total

table_manager:
  retention_deletes_enabled: true
  retention_period: 720h

# Add S3 backend for cold storage
storage_config:
  aws:
    s3: s3://region/bucket
    s3forcepathstyle: false
```

**Compliance Requirements**:

- PCI-DSS: 90 days minimum
- GDPR: Right to deletion (implement log scrubbing)
- PIPEDA (Canada): 1 year for security logs

---

### 5. Automated Dashboard Backups (LOW PRIORITY)

**Effort**: 1 day
**Value**: Disaster recovery

**Objectives**:

- Backup Grafana dashboards to git
- Version control for dashboard changes
- Easy restoration after failures

**Implementation**:

**Option 1: Grafana Dashboard Versioning**

- Enable built-in versioning
- Store in PostgreSQL
- Export via API

**Option 2: Git-based Backups** (Recommended)

```bash
#!/bin/bash
# scripts/backup-grafana-dashboards.sh

GRAFANA_URL="http://localhost:3001"
API_KEY="${GRAFANA_API_KEY}"
BACKUP_DIR="monitoring/grafana/dashboards-backup"

# Export all dashboards
curl -H "Authorization: Bearer ${API_KEY}" \
     "${GRAFANA_URL}/api/search?type=dash-db" | \
  jq -r '.[] | .uid' | \
  xargs -I {} curl -H "Authorization: Bearer ${API_KEY}" \
    "${GRAFANA_URL}/api/dashboards/uid/{}" > "${BACKUP_DIR}/{}.json"

# Commit to git
git add "${BACKUP_DIR}"
git commit -m "chore: backup Grafana dashboards $(date +%Y-%m-%d)"
```

**Schedule**: Daily via cron or GitHub Actions

---

### 6. Slack/Email Notifications (MEDIUM PRIORITY)

**Effort**: 1 day
**Value**: Immediate incident awareness

**Notification Types**:

**Critical** (Immediate):

- Service outages
- High error rates (> 5%)
- Security alerts
- Database failures
- Sent to: Slack #critical-alerts + SMS to on-call

**Warning** (Batched - every 15 min):

- Performance degradation
- Failed jobs
- Warning-level errors
- Sent to: Slack #alerts

**Info** (Daily digest):

- Daily metrics summary
- Successful deployments
- Backup confirmations
- Sent to: Email to team

**Grafana Contact Points**:

```yaml
# monitoring/grafana/provisioning/alerting/contact-points.yml
apiVersion: 1
contactPoints:
  - orgId: 1
    name: slack-critical
    receivers:
      - uid: slack-critical
        type: slack
        settings:
          url: ${SLACK_WEBHOOK_URL}
          recipient: '#critical-alerts'

  - orgId: 1
    name: email-team
    receivers:
      - uid: email-team
        type: email
        settings:
          addresses: ops-team@sentinel.local
```

---

## Implementation Priority

### Phase A: Production Readiness (Week 1)

1. **Sentry Integration** (2-3 days) - HIGH
2. **Critical Alerting Rules** (1-2 days) - HIGH

### Phase B: Advanced Observability (Week 2)

3. **OpenTelemetry + Tempo** (3-4 days) - HIGH VALUE
4. **Notification Channels** (1 day) - MEDIUM

### Phase C: Enhancements (Week 3)

5. **Advanced Dashboards** (2-3 days) - MEDIUM
6. **Log Retention Policies** (1 day) - LOW
7. **Dashboard Backups** (1 day) - LOW

---

## Cost Considerations

**Sentry**:

- Free tier: 5,000 events/month
- Team plan: $26/month (50,000 events)
- Business plan: $80/month (100,000 events)

**Infrastructure**:

- Tempo: +200MB RAM, +1GB disk
- Additional Grafana alerts: Negligible
- S3 cold storage: ~$0.023/GB/month

**Recommendations**:

- Start with Sentry free tier
- Monitor event volume
- Upgrade if exceeding limits

---

## Success Criteria

### Phase A Complete

- [ ] Sentry capturing production errors
- [ ] Critical alerts configured and tested
- [ ] On-call rotation receiving notifications
- [ ] Zero production incidents missed

### Phase B Complete

- [ ] Distributed tracing operational
- [ ] Trace → Log correlation working
- [ ] Slack notifications delivering
- [ ] Mean time to detection (MTTD) < 5 minutes

### Phase C Complete

- [ ] 5 new dashboards operational
- [ ] Log retention policy implemented
- [ ] Dashboard backups automated
- [ ] Full observability coverage achieved

---

## Risk Assessment

**Risks**:

1. **Sentry vendor lock-in**: Mitigated by using open standards (OpenTelemetry)
2. **Alert fatigue**: Start with conservative thresholds, tune over time
3. **Storage costs**: Implement retention policies early
4. **Complexity**: Phase rollout prevents overwhelming team

**Mitigation Strategies**:

- Document all configurations in git
- Use infrastructure as code (docker-compose)
- Regular review of alert rules (monthly)
- Cost monitoring dashboards

---

## Documentation Updates Required

When implementing each phase:

1. **Update Architecture Docs**:
   - `docs/guides/reference/architecture.md` - Add new components

2. **Create How-To Guides**:
   - `docs/guides/howto/howto-configure-sentry.md`
   - `docs/guides/howto/howto-create-alert-rules.md`
   - `docs/guides/howto/howto-setup-distributed-tracing.md`

3. **Update Environment Variables**:
   - `.env.example` - Add Sentry DSN, Slack webhooks, etc.

4. **Runbooks**:
   - `docs/runbooks/incident-response.md` - How to respond to alerts
   - `docs/runbooks/dashboard-restoration.md` - Restore from backups

---

## Related Resources

**Sentry Documentation**:

- Official Guide: https://docs.sentry.io/platforms/node/
- Best Practices: https://docs.sentry.io/product/best-practices/

**OpenTelemetry**:

- Node.js SDK: https://opentelemetry.io/docs/languages/js/
- Grafana Tempo: https://grafana.com/docs/tempo/latest/

**Grafana Alerting**:

- Unified Alerting: https://grafana.com/docs/grafana/latest/alerting/
- Alert Rules: https://grafana.com/docs/grafana/latest/alerting/alerting-rules/

---

## Conclusion

This plan provides a roadmap for enhancing the Sentinel observability stack beyond the foundational implementation. Each phase delivers incremental value while maintaining system stability.

**Recommended Start**: Implement Phase A (Sentry + Alerting) before production deployment to ensure critical error tracking and incident response capabilities.

**Total Estimated Effort**: 10-15 days across 3 phases
**Total Estimated Cost**: ~$50-100/month (Sentry + minor infrastructure)
**Expected Value**: Significantly improved MTTD, faster debugging, proactive issue detection
