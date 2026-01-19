# Sentinel Backend Modernization - Executive Summary

**Date**: January 18, 2026
**Project**: RFID Attendance Tracking System for HMCS Chippawa
**Scope**: Comprehensive backend technology stack evaluation and recommendations

---

## Current State

The Sentinel backend is built on:
- **Runtime**: Bun (5x faster than Node.js with Express)
- **Framework**: Express.js
- **ORM**: Prisma with @prisma/adapter-pg-worker
- **Database**: PostgreSQL
- **Auth**: Custom JWT + session cookies
- **Real-time**: Socket.IO
- **Validation**: Zod
- **Testing**: Vitest (6 test files - limited coverage)

**Overall Assessment**: Solid foundation with good architectural patterns. Already significantly optimized by using Bun runtime. Main opportunities lie in testing coverage, type safety improvements, and potential framework modernization.

---

## Top Recommendations by Category

### 1. Web Framework: **Stay with Express on Bun** (or migrate to Fastify)

**Decision**:
- **If performance is adequate**: Stay with Express on Bun (already 5x faster than Express on Node)
- **If need more speed**: Migrate to Fastify incrementally (2-5x additional boost)
- **New greenfield projects**: Consider Hono or Elysia

**Rationale**:
- Express + Bun already provides 5x performance improvement
- Massive ecosystem, zero learning curve
- Migration risk not justified unless performance is actually inadequate
- Fastify offers incremental migration path if needed

**Alternative Considered**: Hono (best multi-runtime portability), Elysia (maximum Bun performance but requires lock-in)

---

### 2. ORM/Database: **Hybrid Prisma + Kysely** (or stay with Prisma)

**Decision**:
- **Primary recommendation**: Hybrid approach - Prisma for schema management, Kysely for performance-critical queries
- **Conservative option**: Stay with Prisma, enable `relationLoadStrategy: 'join'`

**Rationale**:
- Prisma excels at schema evolution for your 15+ model domain
- Kysely provides best query performance (50ms vs 110ms for complex queries)
- Hybrid approach gives you both excellent DX and optimal runtime performance
- Use raw SQL with `COPY` for bulk imports (3x faster than any ORM)

**Benchmarks**:
| ORM | Simple Reads | Complex Queries | Nested Reads | Bundle Size |
|-----|-------------|-----------------|--------------|-------------|
| TypeORM | **0.73ms** ⭐ | 75ms | **58ms** ⭐ | Large |
| Kysely | 1.27ms | **50ms** ⭐ | N/A | 2MB |
| Drizzle | 1.27ms | 75ms | 1354ms ⚠️ | **7KB** ⭐ |
| Prisma | 1.35ms | 110ms | 65ms | 1.6MB |

---

### 3. Authentication: **better-auth**

**Decision**: Migrate from custom JWT to better-auth

**Rationale**:
- Built-in API key plugin (perfect for kiosk/display auth)
- Modern JWT sessions with refresh rotation
- Self-hosted, zero vendor lock-in
- TypeScript-native with excellent DX
- Offline-capable (critical for kiosks)
- MIT license, active development (25.3k stars)

**Migration**: 1-2 weeks parallel migration, zero downtime

**Rejected Alternatives**:
- Clerk (no self-hosting)
- Lucia (deprecated March 2025)
- Passport (dated, manual work)

---

### 4. Real-Time: **Stay with Socket.IO**

**Decision**: Keep Socket.IO, add JWT auth middleware + rate limiting

**Rationale**:
- Already working, proven at scale
- Excellent Bun support via `@socket.io/bun-engine`
- Perfect room architecture for your 3 client types
- At 10-50 connections, overhead is negligible
- Just needs auth hardening and rate limiting

**Alternative Considered**: Native SSE (simpler for server→client only, but Socket.IO provides more features)

---

### 5. Validation & Type Safety: **ts-rest + Valibot**

**Decision**:
- Migrate to ts-rest for API contract + type safety
- Replace Zod v3 with Valibot for runtime validation

**Rationale**:
- ts-rest keeps your RESTful API design (no paradigm shift like tRPC)
- Generates OpenAPI docs automatically
- End-to-end type safety without code generation
- Valibot: 90% smaller bundle than Zod v3 (1.37KB vs 20KB)
- Incremental adoption - wrap existing Express routes one by one

**Benchmarks**:
| Library | Bundle Size | Validation Speed | Type Safety |
|---------|-------------|------------------|-------------|
| Valibot | **1.37KB** ⭐ | Fast (optimized TTI) | Excellent |
| Zod v4 | 10KB | **8x faster** ⭐ | Excellent |
| Zod v3 | 20KB | Baseline | Excellent |
| TypeBox | 5KB | **Fastest** ⭐ | Excellent |

---

### 6. Testing: **Vitest + Testcontainers + Supertest**

**Decision**: Expand test coverage with integration-first approach

**Critical Actions**:
1. Add Testcontainers for repository integration tests (90% coverage target)
2. Add Supertest for Express route testing (80% coverage target)
3. Use Vitest for test runner (already in use)
4. Add fast-check for property-based testing (CSV validation edge cases)

**Current Gaps** (Critical):
- ❌ No repository integration tests (high risk - SQL bugs undetected)
- ❌ No route testing (high risk - API contract violations)
- ❌ No CSV import testing (medium risk)
- ❌ No WebSocket testing (medium risk)
- ❌ No coverage tracking

**Testing Strategy**: 15% unit, **70% integration**, 15% E2E (Testing Trophy approach)

---

## Implementation Priorities

### Phase 1: Testing Foundation (Weeks 1-2) - **CRITICAL**
**Impact**: High | **Effort**: Medium

1. Install Testcontainers + Supertest + fast-check
2. Write repository integration tests (90% coverage)
3. Write Express route tests with Supertest (80% coverage)
4. Enable coverage tracking in CI/CD

**Why First**: Current testing gaps are highest risk. Integration tests provide immediate confidence in data layer and API contracts.

### Phase 2: Authentication Hardening (Week 3) - **HIGH PRIORITY**
**Impact**: High | **Effort**: Medium

1. Migrate to better-auth
2. Add API key plugin for kiosks/displays
3. Implement refresh token rotation
4. Add auth event logging

**Why Second**: Security improvements and better offline support for kiosks.

### Phase 3: Validation & Type Safety (Weeks 4-6) - **MEDIUM PRIORITY**
**Impact**: Medium | **Effort**: Medium

1. Prototype ts-rest + Valibot on 2 endpoints
2. Incrementally migrate 25 endpoints
3. Generate OpenAPI documentation
4. Create type-safe frontend client

**Why Third**: Developer experience and API documentation improvements. Non-critical but valuable.

### Phase 4: ORM Optimization (Weeks 7-8) - **LOW PRIORITY**
**Impact**: Low | **Effort**: High

1. Benchmark current Prisma performance with realistic data
2. Enable `relationLoadStrategy: 'join'` and measure improvement
3. If still slow, prototype Prisma+Kysely hybrid
4. Migrate performance-critical queries to Kysely

**Why Last**: Only pursue if performance is actually inadequate. Current setup may be sufficient.

---

## NOT Recommended

### ❌ Don't Change Framework (Yet)
- Express + Bun is already 5x faster
- Migration risk not justified unless you're hitting performance limits
- If you do migrate, choose Fastify (incremental migration path)

### ❌ Don't Over-Optimize ORM (Yet)
- Benchmark first, optimize only if needed
- Prisma v7 already 3.4x faster than v6
- Simple `relationLoadStrategy` change may be enough

### ❌ Avoid These Technologies
- **Sequelize**: v7 still in alpha, declining support
- **Lucia**: Deprecated March 2025
- **Clerk/WorkOS**: No self-hosting (dealbreaker)
- **tRPC**: Not suitable for your use case (need public REST API)
- **Drizzle**: Nested query performance bug is dealbreaker (1354ms vs 65ms)

---

## Cost Analysis

All recommended solutions are **self-hosted and free**:
- better-auth: $0 (MIT license)
- ts-rest: $0 (open source)
- Valibot: $0 (open source)
- Testcontainers: $0 (open source)
- Fastify (if migrating): $0 (open source)

**Total Cost**: $0 infrastructure + developer time

**vs. SaaS Alternatives**: Clerk ($21,900/year), SuperTokens Managed ($24,000/year), WorkOS ($125/connection)

---

## Success Metrics

### Testing (Phase 1)
- ✅ 90% repository coverage with Testcontainers
- ✅ 80% route coverage with Supertest
- ✅ Coverage tracking in CI/CD
- ✅ Zero production database bugs

### Authentication (Phase 2)
- ✅ API key rotation capability
- ✅ Offline kiosk authentication working
- ✅ Refresh token rotation implemented
- ✅ Auth event audit trail

### Type Safety (Phase 3)
- ✅ 100% API endpoints using ts-rest
- ✅ OpenAPI spec auto-generated
- ✅ Type-safe frontend client
- ✅ Zero runtime type errors

### Performance (Phase 4)
- ✅ Complex queries under 100ms p95
- ✅ Bulk imports optimized with raw SQL
- ✅ Check-in operations under 50ms

---

## Next Steps

1. **Read detailed reports** in this docs/ directory:
   - `01-current-backend-analysis.md` - Current architecture deep dive
   - `02-framework-comparison.md` - All framework options analyzed
   - `03-orm-database-comparison.md` - ORM benchmarks and recommendations
   - `04-authentication-solutions.md` - Auth solution comparison
   - `05-realtime-communication.md` - WebSocket/SSE analysis
   - `06-validation-type-safety.md` - Validation library comparison
   - `07-testing-strategy.md` - Testing implementation guide

2. **Approve Phase 1** (Testing Foundation) to proceed

3. **Schedule technical review** with team to discuss findings

---

## Key Takeaways

1. **Your current stack is already optimized** - Express on Bun is 5x faster than traditional setups
2. **Testing is the highest priority** - Current gaps expose you to production bugs
3. **Don't over-optimize prematurely** - Benchmark before changing ORMs or frameworks
4. **Incremental migration is key** - All recommended solutions support gradual adoption
5. **Self-hosted solutions exist** - No need for expensive SaaS auth/validation services
6. **Type safety is valuable** - ts-rest provides API contracts without tRPC's limitations

**Bottom Line**: Focus on testing first, then auth hardening. Framework and ORM changes are optional based on actual performance measurements.
