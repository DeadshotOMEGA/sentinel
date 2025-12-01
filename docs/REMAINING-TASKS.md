# Sentinel - Remaining Tasks

> **Last Updated:** November 30, 2025
> **System Grade:** D+ (55/100) - NOT PRODUCTION READY
> **Estimated Timeline:** 6 weeks to production readiness

---

## Implementation Status Summary

### Fully Implemented
- Admin Dashboard (members, badges, divisions, events, visitors, reports, import/export)
- Kiosk Interface (NFC scanning, offline sync, visitor mode, event selection)
- TV Display (presence overview, event attendance, real-time updates)
- Backend API (25+ REST endpoints, WebSocket broadcasting)
- Database (9 tables, migrations, audit logging)
- Hardware NFC Daemon (PN532 on Raspberry Pi 5)

### NOT Production Ready
The system has critical security, testing, and architecture issues that must be resolved before deployment.

---

## Critical Blockers (Week 1)

### SECURITY-01: Hardcoded Credentials in Git
**Severity:** CRITICAL | **Effort:** 4 hours
**Issue:** API keys and database passwords committed to repository history
- `kiosk-dev-key-change-in-production` in `/backend/src/auth/middleware.ts:12`
- Database password `sentinel_dev` in git history

**Action:**
1. Rotate all credentials immediately
2. Run `git-filter-repo` to remove from history
3. Update deployment to use environment variables only
4. Revoke all existing tokens/keys

### SECURITY-02: Unauthenticated PII Access
**Severity:** CRITICAL | **Effort:** 1 day
**Issue:** Member data accessible without authentication on some endpoints

**Action:**
1. Add authentication middleware to all protected endpoints
2. Audit all routes for authorization requirements
3. Add integration tests for auth enforcement

### SECURITY-03: No Rate Limiting
**Severity:** CRITICAL | **Effort:** 4 hours
**Issue:** Vulnerable to brute force and DoS attacks

**Action:**
1. Install `express-rate-limit`
2. Apply to all public endpoints
3. Configure Redis-backed rate limiting for distributed deployment

### SECURITY-04: Token Storage
**Severity:** HIGH | **Effort:** 1 day
**Issue:** JWT stored in localStorage (XSS vulnerable)

**Action:**
1. Migrate to httpOnly cookies
2. Add CSRF protection
3. Update frontend auth flow

### SECURITY-05: Missing Security Headers
**Severity:** HIGH | **Effort:** 2 hours
**Issue:** No CSRF, CSP, X-Frame-Options headers

**Action:**
1. Add helmet.js middleware
2. Configure Content-Security-Policy
3. Set X-Frame-Options: DENY

---

## Architecture Issues (Week 2)

### ARCH-01: N+1 Query Patterns
**Severity:** CRITICAL | **Effort:** 2 days
**Issue:** Every check-in triggers 3+ database queries

**Action:**
1. Implement DataLoader pattern for batching
2. Add eager loading for member→badge→division relationships
3. Add query logging in development to catch new N+1s

### ARCH-02: No Service Layer
**Severity:** HIGH | **Effort:** 3 days
**Issue:** Business logic scattered across routes

**Action:**
Create service modules:
- `checkin-service.ts` - Check-in validation, presence calculation
- `member-service.ts` - Member CRUD, badge assignment
- `badge-service.ts` - Badge lifecycle, assignment types
- `presence-service.ts` - Real-time presence aggregation

### ARCH-03: No Connection Pooling
**Severity:** CRITICAL | **Effort:** 4 hours
**Issue:** Database crashes under load, exit(-1) on error

**Action:**
1. Configure pg-pool with proper limits
2. Add connection health checks
3. Implement graceful degradation

### ARCH-04: No Transaction Boundaries
**Severity:** HIGH | **Effort:** 1 day
**Issue:** Bulk sync can cause partial data corruption

**Action:**
1. Wrap bulk operations in transactions
2. Add rollback on any failure
3. Implement idempotency keys for retries

### ARCH-05: Race Conditions
**Severity:** HIGH | **Effort:** 1 day
**Issue:** Presence calculations have race conditions, cache invalidated after queries

**Action:**
1. Use database-level locking for presence updates
2. Invalidate cache before queries
3. Add optimistic concurrency control

### ARCH-06: Type System Mismatch
**Severity:** HIGH | **Effort:** 2 days
**Issue:** Database schema doesn't match TypeScript types

**Action:**
1. Generate types from database schema (prisma/drizzle)
2. Add CI check for type/schema sync
3. Remove manual type definitions

---

## Code Quality (Week 2-3)

### QUALITY-01: Build Artifacts in Git
**Severity:** CRITICAL | **Effort:** 2 hours
**Issue:** Every `.tsx` has compiled `.js` twin in `shared/ui/`

**Action:**
1. Delete all `.js` files in shared/ui
2. Update `.gitignore`
3. Add pre-commit hook to prevent future commits

### QUALITY-02: Test Coverage at 6.8%
**Severity:** CRITICAL | **Effort:** 1 week
**Issue:** 177 TypeScript files, only 12 test files

**Priority Tests to Add:**
| Test | File | Effort |
|------|------|--------|
| Offline sync integration | `kiosk/src/services/sync.ts` (270 lines) | 2 days |
| Import service unit | `backend/src/services/import.ts` (458 lines) | 1 day |
| Badge check-in E2E | Kiosk flow | 2 days |
| WebSocket state management | Real-time updates | 1 day |

### QUALITY-03: Version Fragmentation
**Severity:** HIGH | **Effort:** 1 day
**Issue:** Inconsistent dependencies across apps

| Package | frontend | kiosk | tv-display | Target |
|---------|----------|-------|------------|--------|
| React | 18.2.0 | 19.2.0 | 18.2.0 | 18.2.0 |
| HeroUI | 2.8.5 | 3.0.0-beta | 2.8.5 | 2.8.5 |
| TypeScript | 5.3 | 5.9 | 5.3 | 5.3 |

**Action:**
1. Pin all apps to target versions
2. Add CI check for version consistency
3. Document upgrade path for React 19

### QUALITY-04: Inconsistent Logging
**Severity:** MEDIUM | **Effort:** 4 hours
**Issue:** Mix of `console.log` and Winston

**Action:**
1. Replace all console.log with Winston
2. Add structured logging format
3. Configure log levels per environment

---

## Frontend Audit Remediation (Weeks 2-4)

### Phase 1: Critical Accessibility (Week 2) - 6 Tasks

| ID | Task | Effort | Status |
|----|------|--------|--------|
| T1.1 | Install Lucide React icon library | 4 hrs | Not Started |
| T1.2 | Fix WCAG AA contrast violations (3.83:1 → 4.5:1) | 1 day | Not Started |
| T1.3 | Create accessible Badge component | 1 day | Not Started |
| T1.4 | Implement focus-visible styles | 1 day | Not Started |
| T1.5 | Increase kiosk touch targets (48px → 56px) | 1 day | Not Started |
| T1.6 | Add comprehensive ARIA labels | 2 days | Not Started |

### Phase 2: Visual Design (Week 2-3) - 7 Tasks

| ID | Task | Effort | Dependencies |
|----|------|--------|--------------|
| T2.1 | Create StatsCard component | 1 day | T1.2 |
| T2.2 | Establish typography hierarchy | 1 day | None |
| T2.3 | Replace emoji icons with Lucide | 1 day | T1.1 |
| T2.4 | Redesign dashboard stats cards | 4 hrs | T2.1 |
| T2.5 | Create badge color system | 1 day | T1.2 |
| T2.6 | Redesign reports stats cards | 4 hrs | T2.1 |
| T2.7 | Redesign TV display presence stats | 1 day | T2.1 |

### Phase 3: UX Enhancements (Week 3) - 15 Tasks

| ID | Task | Effort | Dependencies |
|----|------|--------|--------------|
| T3.1 | Create DataTable component (sorting, ARIA) | 2 days | T1.6, T2.2 |
| T3.2 | Add pagination to DataTable | 1 day | T3.1 |
| T3.3 | Create LoadingSkeleton components | 1 day | None |
| T3.4 | Create EmptyState component | 4 hrs | T1.1 |
| T3.5 | Create ConfirmDialog component | 1 day | T1.4 |
| T3.6 | Create SearchBar component (Cmd+K) | 1 day | T1.6 |
| T3.7 | Integrate DataTable in Members page | 1 day | T3.1, T3.2, T3.3 |
| T3.8 | Add delete confirmation to Members | 4 hrs | T3.5, T3.7 |
| T3.9 | Redesign Visitors page tabs | 1 day | T3.1, T3.6 |
| T3.10 | Add sign-out confirmation | 4 hrs | T3.5, T3.9 |
| T3.11 | Add search to Events page | 1 day | T3.1, T3.6 |
| T3.12 | Add search to Settings page | 4 hrs | T3.1, T3.5, T3.6 |
| T3.13 | Add date picker and chart to Reports | 2 days | T3.9 |
| T3.14 | Add loading states to stats cards | 4 hrs | T2.1, T3.3 |
| T3.15 | Add empty states to all tables | 1 day | T3.4, T3.7 |

### Phase 4: Polish & Responsive (Week 4) - 12 Tasks

| ID | Task | Effort | Dependencies |
|----|------|--------|--------------|
| T4.1 | Add mobile hamburger menu | 1 day | None |
| T4.2 | Make tables responsive | 1 day | T3.1 |
| T4.3 | Optimize kiosk landscape layout | 1 day | None |
| T4.4 | Improve kiosk network indicator | 4 hrs | None |
| T4.5 | Fix TV display ActivityFeed | 1 day | None |
| T4.6 | Add micro-transitions | 1 day | None |
| T4.7 | Add error boundaries | 1 day | None |
| T4.8 | Add branding elements | 4 hrs | None |
| T4.9 | Add skip nav and ARIA landmarks | 4 hrs | T1.6 |
| T4.10 | Final accessibility QA (GATE) | 2 days | All T1-T4 |
| T4.11 | Responsive testing | 1 day | T4.1, T4.2, T4.3 |
| T4.12 | Kiosk hardware testing | 1 day | T4.3, T4.4 |

**Critical Path:** T1.2 → T1.3 → T2.1 → T2.4 → T3.1 → T3.7 → T4.2 → T4.10

---

## Deployment Hardening (Week 5-6)

### DEPLOY-01: WebSocket Authentication
**Severity:** CRITICAL | **Effort:** 1 day
**Issue:** Anyone can connect and subscribe to all events

**Action:**
1. Add JWT validation on WebSocket handshake
2. Implement channel-based authorization
3. Add connection rate limiting

### DEPLOY-02: Environment Configuration
**Severity:** HIGH | **Effort:** 4 hours
**Issue:** Frontend baseURL hardcoded

**Action:**
1. Move all URLs to environment variables
2. Add runtime config injection
3. Document required environment variables

### DEPLOY-03: Monitoring & Observability
**Severity:** MEDIUM | **Effort:** 2 days

**Action:**
1. Add health check endpoints
2. Implement structured logging with correlation IDs
3. Add performance metrics (response times, query counts)
4. Set up error alerting

---

## Summary

| Category | Critical | High | Medium | Total |
|----------|----------|------|--------|-------|
| Security | 3 | 2 | 0 | 5 |
| Architecture | 2 | 4 | 0 | 6 |
| Code Quality | 2 | 1 | 1 | 4 |
| Frontend | 3 | 37 | 0 | 40 |
| Deployment | 1 | 1 | 1 | 3 |
| **Total** | **11** | **45** | **2** | **58** |

### Recommended Team Allocation
- **Security + Architecture:** 1 senior backend developer (2 weeks)
- **Code Quality + Testing:** 1 developer (1 week)
- **Frontend Audit:** 2-3 frontend developers (3 weeks)
- **Deployment:** 1 DevOps/backend (1 week)

### Week-by-Week Plan
1. **Week 1:** Security lockdown (SECURITY-01 through 05)
2. **Week 2:** Architecture fixes (ARCH-01 through 06) + Frontend Phase 1
3. **Week 3:** Code quality + testing + Frontend Phases 2-3
4. **Week 4:** Frontend Phase 4 + remaining tests
5. **Week 5:** Deployment hardening
6. **Week 6:** Final QA, performance testing, production prep
