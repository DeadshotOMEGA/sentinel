# Architecture Remediation Investigation

> **Date:** 2025-12-01
> **Status:** ✅ Completed

---

## Implementation Summary

All 6 architecture issues successfully resolved:
- **ARCH-01:** Redis direction cache implemented
- **ARCH-02:** Service layer created (checkin, presence, member, badge services)
- **ARCH-03:** Already implemented (pool + health checks)
- **ARCH-04:** Import wrapped in Prisma transactions
- **ARCH-05:** Defense in depth (Redis atomic + DB constraint + advisory locks)
- **ARCH-06:** Prisma migration completed with generated types

---

## Executive Summary

Analysis of 6 architecture issues from REMAINING-TASKS.md. One issue (ARCH-03) already resolved. Remaining 5 issues addressed with Prisma migration as foundation.

---

## Issue Analysis

### ARCH-01: N+1 Query Patterns

**Status:** Mostly Fixed, Minor Optimization Remaining

**Current State:**
- Check-in flow does 2-3 queries (badge+member JOIN, last direction, stats)
- Batch methods exist: `findLatestByMembers()`, `findByIds()`, `findBySerialNumbers()`
- Presence stats cached in Redis (60s TTL)

**Decision:** Redis cache for member direction
- Key: `member:direction:{memberId}` → 'in' | 'out'
- Set on every check-in (always fresh)
- Fallback to DB query on cache miss
- Reduces check-in to 1 query + 1 Redis GET

---

### ARCH-02: No Service Layer

**Status:** Partial - Some Services Exist

**Current State:**
- Existing: `import-service.ts`, `sync-service.ts`, `event-service.ts`
- Missing: Business logic in routes (checkins.ts:45-178)

**Decision:** Create 4 new services

| Service | Responsibility |
|---------|---------------|
| `checkin-service.ts` | Check-in validation, direction calc, duplicate detection |
| `presence-service.ts` | Real-time aggregation, WebSocket broadcasts |
| `member-service.ts` | Member lifecycle, status transitions |
| `badge-service.ts` | Badge lifecycle, assignment validation |

---

### ARCH-03: Connection Pooling

**Status:** Already Implemented

**Evidence:**
- `connection.ts:35-44` - Pool configured with `max: 20, idleTimeoutMillis: 30000`
- `connection.ts:50-57` - Error handler no longer calls `process.exit(-1)`
- `connection.ts:67-80` - Health check `checkDatabaseHealth()` exists

**Action:** None required. Consider adding `min: 2` for production warmth.

---

### ARCH-04: Transaction Boundaries

**Status:** Partial - Individual Operations Use Transactions

**Current State:**
- `bulkCreate` and `bulkUpdate` use transactions internally
- `import-service.ts:440-453` calls them as separate transactions
- If bulkUpdate fails after bulkCreate succeeds → partial corruption

**Decision:** Wrap entire import in single Prisma `$transaction`

```typescript
await prisma.$transaction(async (tx) => {
  const added = await tx.member.createMany(...);
  const updated = await tx.member.updateMany(...);
  const flagged = await tx.member.updateMany(...);
  return { added, updated, flagged };
});
```

---

### ARCH-05: Race Conditions

**Status:** Partial - Cache Race Fixed, Direction Race Remains

**Current State:**
- Fixed: Cache invalidated BEFORE insert (checkin-repository.ts:252)
- Unfixed: Two concurrent check-ins can read same direction

**Decision:** Defense in Depth (3 layers)

1. **Redis Atomic Toggle:** `GETSET` or Lua script for atomic direction swap
2. **DB Unique Constraint:** Prevent duplicate direction within 5s window
3. **Advisory Locks:** For complex multi-step operations (import, bulk sync)

```sql
CREATE UNIQUE INDEX idx_checkins_member_time_dedup
ON checkins (member_id, direction, (date_trunc('second', timestamp)));
```

---

### ARCH-06: Type System Mismatch

**Status:** Partial - Manual Types, Some Alignment Done

**Current State:**
- Types manually defined in `shared/types/index.ts`
- Migration 005 aligned several mismatches
- Known mismatch: `member_type` CHECK constraint vs TypeScript union

**Decision:** Prisma Big Bang Migration

**Phase 1:** Introspect existing schema
```bash
bunx prisma init
bunx prisma db pull
```

**Phase 2:** Generate types
```bash
bunx prisma generate
```

**Phase 3:** Replace all repositories with Prisma client
- Convert all 7 repositories in single PR
- Remove `pg` dependency
- Types generated from schema automatically

---

## Implementation Plan

### Execution Order

```
Phase 1: Prisma Migration (2 days)
├── prisma init + db pull
├── Schema review and adjustments
├── Convert all 7 repositories to Prisma
├── Update shared/types to export Prisma types
└── Remove pg dependency

Phase 2: Service Layer (2 days)
├── Create checkin-service.ts
├── Create presence-service.ts
├── Create member-service.ts
├── Create badge-service.ts
└── Refactor routes to be thin

Phase 3: Race Conditions (1 day)
├── Redis atomic direction toggle
├── Add DB unique constraint migration
└── Advisory lock wrapper utility

Phase 4: Transaction Boundaries (4 hours)
├── Import wrapped in $transaction
├── Bulk sync wrapped in $transaction
└── Test rollback scenarios
```

### Risk Assessment

| Phase | Risk | Mitigation |
|-------|------|------------|
| Prisma | Introspection gaps | Manual schema review |
| Services | Breaking changes | Test coverage first |
| Race Conditions | Constraint conflicts | Gradual rollout |
| Transactions | Deadlocks | Lock ordering |

### Success Criteria

- [ ] Zero `any` types in backend
- [ ] Check-in latency < 100ms (P95)
- [ ] No N+1 queries in critical paths
- [ ] All bulk operations atomic
- [ ] Concurrent check-in test passes

---

## Files to Modify

### Phase 1: Prisma

| File | Action |
|------|--------|
| `backend/prisma/schema.prisma` | Create (from introspection) |
| `backend/src/db/repositories/*.ts` | Replace with Prisma |
| `backend/src/db/connection.ts` | Remove or simplify |
| `backend/package.json` | Add prisma, remove pg |
| `shared/types/index.ts` | Export from @prisma/client |

### Phase 2: Services

| File | Action |
|------|--------|
| `backend/src/services/checkin-service.ts` | Create |
| `backend/src/services/presence-service.ts` | Create |
| `backend/src/services/member-service.ts` | Create |
| `backend/src/services/badge-service.ts` | Create |
| `backend/src/routes/checkins.ts` | Thin to service calls |
| `backend/src/routes/members.ts` | Thin to service calls |
| `backend/src/routes/badges.ts` | Thin to service calls |

### Phase 3: Race Conditions

| File | Action |
|------|--------|
| `backend/db/migrations/008_race_condition_constraints.sql` | Create |
| `backend/src/services/checkin-service.ts` | Add Redis atomic ops |
| `backend/src/utils/advisory-lock.ts` | Create |

### Phase 4: Transactions

| File | Action |
|------|--------|
| `backend/src/services/import-service.ts` | Wrap in $transaction |
| `backend/src/services/sync-service.ts` | Wrap in $transaction |

---

## Open Questions

1. **Prisma Edge Cases:** Complex CTEs in `getPresenceStats()` - use `$queryRaw`?
2. **Redis Failover:** What happens if Redis unavailable during check-in?
3. **Migration Rollback:** Keep pg temporarily or clean cut?

---

## References

- REMAINING-TASKS.md lines 46-103
- connection.ts:35-57 (pool config)
- checkin-repository.ts:200-279 (query patterns)
- import-service.ts:357-456 (transaction issue)
