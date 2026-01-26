---
type: plan
title: 'Backend Rebuild Phase 4 Completion'
status: active
created: 2026-01-23
last_updated: 2026-01-23
lifecycle: active
reviewed: 2026-01-23
expires: 2026-02-15
ai:
  priority: high
  context_load: always
  triggers:
    - phase-4
    - completion
    - production-readiness
    - coverage
    - documentation
  token_budget: 2000
related_code:
  - apps/backend/
  - docs/
---

# Backend Rebuild Phase 4 Completion Plan

## Executive Summary

Complete the final 5% of backend rebuild to achieve production readiness before frontend development.

**Current State:** 95% complete - 63 API endpoints, 157 route tests, WebSocket infrastructure, CI/CD pipelines
**Timeline:** 3-5 days (20-30 hours)
**Goal:** Production-ready backend with all infrastructure verified and documented

---

## Phase 4 Completion Tasks

### Task 1: Coverage Verification (2 hours)

**Goal:** Verify 80%+ overall test coverage

**Steps:**

1. Run full coverage analysis:
   ```bash
   cd apps/backend
   pnpm test:coverage
   ```
2. Review coverage report:
   - Repository layer: 88-90% (target met ✅)
   - Route layer: 80%+ (157 tests passing ✅)
   - Overall: 70-80% (adjusted for deferred services)
3. Identify any critical gaps in core services
4. Add integration tests for critical uncovered paths (if needed)

**Success Criteria:**

- Repository layer: ≥88% ✅
- Route layer: ≥80% ✅
- Overall: ≥70%
- Zero flaky tests

**Critical Files:**

- [vitest.config.ts](apps/backend/vitest.config.ts)
- [coverage/index.html](apps/backend/coverage/index.html)

---

### Task 2: Query Performance Benchmarks (3 hours)

**Goal:** Validate query performance, determine if Kysely optimization needed

**Steps:**

1. Generate production-sized test data:
   - 200+ members
   - 5,000+ checkins (last 30 days)
   - 50+ events
   - 100+ visitors
2. Run benchmark script:
   ```bash
   cd apps/backend
   pnpm tsx scripts/benchmark-queries.ts
   ```
3. Analyze results:
   - **OK (< 100ms):** No action
   - **SLOW (100-200ms):** Document, consider future optimization
   - **VERY SLOW (≥ 200ms):** Kysely migration needed

**Decision Point: If Kysely Needed (+1-2 days)**

1. Install dependencies:
   ```bash
   pnpm --filter @sentinel/database add kysely prisma-kysely
   ```
2. Generate Kysely types from Prisma schema
3. Migrate 5-10 slowest queries
4. Re-run benchmarks to verify improvement

**Success Criteria:**

- All critical queries < 200ms
- Report generation < 500ms (batch operations acceptable)
- Benchmark results documented

**Critical Files:**

- [scripts/benchmark-queries.ts](apps/backend/scripts/benchmark-queries.ts) ✅
- [packages/database/src/kysely.ts](packages/database/src/kysely.ts) (create if needed)

---

### Task 3: Documentation & API Access (3 hours)

**Goal:** Complete API documentation for frontend handoff

**3.1 Swagger UI Hosting (30 min)**

- Mount Swagger UI at `/docs` endpoint
- Mount ReDoc at `/redoc` endpoint
- Add optional authentication middleware
- Verify all 63 endpoints visible

**3.2 README Updates (1 hour)**

- Create [apps/backend/README.md](apps/backend/README.md):
  - Quick start instructions
  - Environment variables
  - API documentation links
  - Testing commands
  - Docker deployment
- Update root [README.md](README.md):
  - Monorepo structure
  - Backend package overview

**3.3 API Authentication Documentation (30 min)**

- Document authentication methods:
  - JWT sessions (admin web panel)
  - API keys (kiosks, RFID readers)
  - Bearer token format
- Create example curl commands
- Document rate limiting (100 req/15min)

**Success Criteria:**

- Swagger UI accessible at `/docs`
- ReDoc accessible at `/redoc`
- README covers all setup steps
- Authentication documented with examples

**Critical Files:**

- [apps/backend/src/routes/swagger.ts](apps/backend/src/routes/swagger.ts) (create)
- [apps/backend/README.md](apps/backend/README.md) (create)
- [README.md](README.md) (update)

---

### Task 4: Final QA & Readiness Check (3 hours)

**Goal:** Validate production readiness

**4.1 Test Suite Verification (30 min)**

```bash
cd /home/sauk/projects/sentinel
pnpm test
```

- Verify 477 repository tests pass
- Verify 157 route tests pass
- Confirm ~4-5 minute total time
- Check for flaky tests (should be zero)

**4.2 Docker Build Verification (30 min)**

```bash
cd apps/backend
docker build -t sentinel-backend:test .
cd ../..
docker-compose up -d
curl http://localhost:3000/health
docker-compose logs backend
docker-compose down
```

**4.3 CI/CD Pipeline Verification (30 min)**

- Review GitHub Actions workflows (test.yml, build.yml)
- Trigger test workflow manually
- Verify all steps pass:
  - Type checking
  - Linting
  - Test execution
  - Coverage reporting
  - Build artifacts
- Check Codecov integration

**4.4 Security & Dependencies (15 min)**

```bash
pnpm audit  # Expected: No vulnerabilities
pnpm outdated  # Document any major updates
```

- Verify `.env.example` completeness
- Check hono security fix still applied

**Success Criteria:**

- All tests passing
- Docker build succeeds
- Health endpoint returns 200
- CI/CD workflows green
- Security audit clean

---

## Deferred Items (NOT Required for Frontend)

### Routes Deferred to Phase 5+

- `/api/reports` (21 endpoints) - Report generation
- `/api/bmq-courses` (7 endpoints) - BMQ attendance
- `/api/training-years` (4 endpoints) - Training year setup
- `/api/lists` (5 endpoints) - Dynamic list management
- `/api/enums` (8 endpoints) - Enumeration values
- `/api/admin-users` (11 endpoints) - Admin management
- `/api/dev`, `/api/dev-tools` (11 endpoints) - Development tools
- `/api/settings`, `/api/report-settings` (6 endpoints) - Configuration

**Rationale:** These are administrative, reporting, and specialized features not required for frontend MVP. They can be implemented iteratively.

### Services Partially Complete

- 7 core services complete: checkin, badge, member, presence, event, security-alert, dds, lockup
- 10 services deferred: import-service (CSV), attendance-calculator, bmq-attendance-calculator, sync-service, simulation-service, attendee-import, tag-service, schedule-resolver, and others

**Rationale:** Core services are well-tested through route integration tests. Deferred services support administrative features.

### Testing Gaps

- Service layer integration tests (deferred)
- WebSocket integration tests (deferred)
- Property-based tests for CSV import (deferred)
- Mutation testing (optional)

**Rationale:** Route integration tests provide comprehensive coverage of core functionality. Service-specific tests can be added iteratively.

---

## Definition of "Done"

### Technical Checklist

**Testing:**

- [ ] 70-80% overall coverage
- [x] 477 repository tests passing
- [x] 157 route tests passing
- [ ] Zero flaky tests
- [ ] CI/CD pipeline green

**Performance:**

- [ ] Critical queries < 200ms
- [x] Health endpoint < 100ms
- [x] WebSocket connections stable

**Documentation:**

- [ ] Swagger UI at `/docs`
- [ ] README.md with setup
- [ ] Authentication documented
- [ ] .env.example complete

**Deployment:**

- [ ] Docker build succeeds
- [ ] docker-compose working
- [x] Health checks configured
- [x] Graceful shutdown working

**Security:**

- [x] Security audit passed
- [x] better-auth configured
- [x] Rate limiting active
- [x] CORS configured
- [x] Helmet headers enabled

### Functional Checklist

**API Completeness:**

- [x] 10 core resources (63 endpoints)
- [x] Authentication endpoints
- [x] WebSocket channels (10)
- [x] Error handling
- [x] Validation schemas

**Business Logic:**

- [x] Check-in/out flow
- [x] Badge assignment
- [x] Event management
- [x] Visitor tracking
- [x] DDS operations
- [x] Lockup execution
- [x] Security alerts

### Frontend Readiness Gates

**Blocking Issues:** None ✅

**Requirements Met:**

- [x] Authentication API
- [x] Personnel management API
- [x] Attendance tracking API
- [x] Event management API
- [x] Real-time WebSocket
- [x] OpenAPI schema
- [x] CORS configured
- [x] Health checks

**Frontend Can Start When:**

1. [x] 10 core API routes tested
2. [x] OpenAPI spec generated
3. [x] WebSocket server working
4. [ ] Swagger UI hosted (Task 3.1)
5. [ ] Authentication documented (Task 3.3)
6. [ ] README with setup (Task 3.2)
7. [ ] Coverage verified (Task 1)
8. [ ] Docker validated (Task 4.2)

---

## Timeline

### Day 1 (6-8 hours)

- **Morning:** Task 1 - Coverage verification (2h)
- **Afternoon:** Task 3 - Documentation (3h)
  - Swagger UI hosting
  - README updates
  - Authentication docs
- **Evening:** Task 4.1 - Test verification (1h)

### Day 2 (6-8 hours)

- **Morning:** Task 2 - Query benchmarks (3h)
- **Afternoon:** Task 4.2-4.4 - Final QA (3h)
  - Docker verification
  - CI/CD check
  - Security audit

### Day 3 (Optional - if Kysely needed)

- Kysely migration for slow queries (6-8h)

**Total:** 3-5 days depending on query performance

---

## Optional Enhancements (Time Permitting)

These are NOT required for frontend work but would improve developer experience:

### Enhancement 1: API Client Generator (1-2 hours)

Generate TypeScript SDK from OpenAPI spec for frontend use:

```bash
pnpm add -D -w @hey-api/openapi-ts
pnpm openapi-ts -i apps/backend/openapi.json -o packages/api-client/src
```

**Benefits:**

- Type-safe API client for frontend
- Auto-generated request/response types
- Reduces frontend boilerplate

### Enhancement 2: WebSocket Client Helper (1 hour)

Create reusable WebSocket connection helper:

```typescript
// packages/websocket-client/src/index.ts
import { io } from 'socket.io-client'

export function createSentinelClient(token: string) {
  return io(process.env.NEXT_PUBLIC_WS_URL, {
    auth: { token },
    reconnection: true,
  })
}
```

**Benefits:**

- Consistent WebSocket setup across frontend apps
- Handles reconnection logic
- Type-safe event handlers

### Enhancement 3: Docker Compose for Development (30 min)

Add frontend-specific services to docker-compose.yml:

```yaml
services:
  frontend-admin:
    build: ./apps/frontend-admin
    ports: ['3001:3000']
    environment:
      NEXT_PUBLIC_API_URL: http://backend:3000

  frontend-kiosk:
    build: ./apps/frontend-kiosk
    ports: ['3002:3000']
```

**Benefits:**

- Full-stack development environment
- Easier testing of frontend-backend integration
- Consistent development setup

### Enhancement 4: Postman/Insomnia Collection (30 min)

Export API collection for manual testing:

- Import OpenAPI spec into Postman
- Configure environment variables (dev, staging, prod)
- Add pre-request scripts for authentication
- Share collection with team

**Benefits:**

- Manual API testing without writing curl commands
- Team can explore API interactively
- Useful for QA and debugging

---

## Post-Completion Actions

### Immediate (Before Starting Tasks)

1. Archive old plan to completed folder:
   ```bash
   mkdir -p docs/plans/completed
   mv docs/plans/active/backend-rebuild-plan.md docs/plans/completed/backend-rebuild-plan.md
   ```

   - Amendment already added to old plan ✅
   - Documents what was transferred and what was deferred

### After Phase 4 Complete

1. Create GitHub Release `v2.0.0-backend-complete`
2. Create `frontend-development-plan.md` in `docs/plans/future/`
3. Team demo of 63 API endpoints
4. Frontend handoff with OpenAPI spec
5. Consider optional enhancements (if time permits)

### Future Sprints

- **Phase 5:** Implement 11 deferred routes (2-3 weeks)
- **Phase 6:** Advanced features and reporting (2-3 weeks)
- **Phase 7:** Monitoring & observability (1 week)

---

## Risk Assessment

### LOW RISK ✅

- Coverage verification (tests passing)
- Documentation (straightforward)
- Docker build (already tested)
- CI/CD (workflows working)

### MEDIUM RISK ⚠️

- Query benchmarks (may reveal issues)
  - **Mitigation:** Kysely plan ready
  - **Impact:** +1-2 days if needed

### HIGH RISK ❌

- None identified

---

## Success Metrics

### Quantitative

- Repository coverage: 88-90% ✅
- Route coverage: 80-85% ✅
- Overall coverage: 70-80%
- API endpoints: 63 ✅
- WebSocket channels: 10 ✅
- Health endpoint: < 100ms ✅
- Critical queries: < 200ms

### Qualitative

- TypeScript strict mode ✅
- No `any` types ✅
- ESLint passing ✅
- Prettier formatting ✅
- Repository pattern with DI ✅
- ts-rest type safety ✅
- Comprehensive error handling ✅
- Production logging ✅

---

## Critical Files

### Coverage & Testing

- [apps/backend/vitest.config.ts](apps/backend/vitest.config.ts)
- [apps/backend/tests/integration/\*_/_.test.ts](apps/backend/tests/integration/)

### Performance

- [apps/backend/scripts/benchmark-queries.ts](apps/backend/scripts/benchmark-queries.ts)
- [packages/database/src/kysely.ts](packages/database/src/kysely.ts) (create if needed)

### Documentation

- [apps/backend/src/routes/swagger.ts](apps/backend/src/routes/swagger.ts) (create)
- [apps/backend/README.md](apps/backend/README.md) (create)
- [README.md](README.md) (update)
- [apps/backend/openapi.json](apps/backend/openapi.json) ✅

### Deployment

- [apps/backend/Dockerfile](apps/backend/Dockerfile) ✅
- [docker-compose.yml](docker-compose.yml) ✅
- [.github/workflows/test.yml](.github/workflows/test.yml) ✅
- [.github/workflows/build.yml](.github/workflows/build.yml) ✅

---

## Frontend Preparation Checklist

Before frontend work begins, ensure these artifacts are ready:

### 1. API Documentation Package

- [x] OpenAPI 3.0 spec generated ([openapi.json](apps/backend/openapi.json))
- [ ] Swagger UI hosted at `/docs`
- [ ] ReDoc hosted at `/redoc`
- [ ] Example requests/responses in docs
- [ ] Authentication flow documented with examples

### 2. Development Environment Guide

- [ ] README with quick start (5 minutes to first API call)
- [ ] Environment variables documented (.env.example)
- [ ] Docker Compose one-command setup
- [ ] Troubleshooting guide (common errors + solutions)

### 3. API Client Assets

- [x] OpenAPI spec available for code generation
- [ ] Optional: Pre-generated TypeScript SDK
- [ ] WebSocket connection examples
- [ ] Authentication token management examples

### 4. Test Accounts & Data

- [ ] Create admin test account (email: admin@test.com, password: test123)
- [ ] Create API key for testing (document in README)
- [ ] Seed database with sample data:
  - 10 members across 3 divisions
  - 5 active badges
  - Recent checkins (last 24 hours)
  - 2 active events
  - 3 visitors
- [ ] Document how to reset test data

### 5. Integration Examples

Create example implementations:

- [ ] Authentication flow (login + token refresh)
- [ ] REST API call with error handling
- [ ] WebSocket connection + subscription
- [ ] Real-time update handling
- [ ] File upload (if applicable)

### 6. API Stability Guarantees

Document breaking change policy:

- [ ] Versioning strategy (v1, v2, etc. OR date-based)
- [ ] Deprecation notice period (30 days minimum)
- [ ] Changelog format for API changes
- [ ] How to request new endpoints or changes

### 7. Performance Expectations

Document performance baselines:

- [ ] Average response times per endpoint
- [ ] Rate limits per authentication method
- [ ] WebSocket message latency expectations
- [ ] Concurrent connection limits

### 8. Frontend Handoff Meeting Agenda

Prepare to cover:

1. Architecture overview (5 min)
   - REST API + WebSocket pattern
   - Authentication (sessions vs API keys)
   - Rate limiting strategy
2. Live API demo (10 min)
   - Swagger UI walkthrough
   - Test all core flows
   - Show WebSocket real-time updates
3. Development setup (10 min)
   - Clone repo + install dependencies
   - Start backend with Docker
   - Make first API call
   - Connect to WebSocket
4. Q&A (10 min)
   - Address concerns
   - Clarify requirements
   - Discuss timeline

---

## Verification

### End-to-End Test

1. Start backend with Docker:
   ```bash
   docker-compose up -d
   ```
2. Check health: `curl http://localhost:3000/health`
3. View Swagger docs: `http://localhost:3000/docs`
4. Test authentication:
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@test.com","password":"test123"}'
   ```
5. Test WebSocket connection (use WebSocket client)
6. Run full test suite: `pnpm test`
7. Check coverage: `pnpm test:coverage`

### Acceptance Criteria

- All curls return expected responses
- Swagger UI loads and shows all endpoints
- WebSocket connects successfully
- All tests pass (634 tests: 477 repo + 157 route)
- Coverage meets targets (70-80% overall)
- Docker container runs without errors

---

## Next Plan After Completion

Create `frontend-development-plan.md` covering:

- Frontend architecture (Next.js App Router)
- Component library (HeroUI)
- API client generation from OpenAPI
- WebSocket integration
- Authentication flow
- Real-time updates UI
- Deployment strategy
