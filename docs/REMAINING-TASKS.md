# Sentinel - Remaining Tasks

> **Last Updated:** December 1, 2025
> **System Grade:** B (78/100) - DEPLOYMENT HARDENING REMAINING
> **Estimated Timeline:** 1 week to production readiness

---

## Implementation Status Summary

### Fully Implemented
- Admin Dashboard (members, badges, divisions, events, visitors, reports, import/export)
- Kiosk Interface (NFC scanning, offline sync, visitor mode, event selection)
- TV Display (presence overview, event attendance, real-time updates)
- Backend API (25+ REST endpoints, WebSocket broadcasting)
- Database (9 tables, migrations, audit logging)
- Hardware NFC Daemon (PN532 on Raspberry Pi 5)

### Near Production Ready
Security, architecture, code quality, and frontend audit issues resolved. Only deployment hardening (WebSocket auth, env config, monitoring) remains before production.

---

## ~~Critical Blockers (Week 1)~~ COMPLETED

### ~~SECURITY-01: Hardcoded Credentials in Git~~ ✅ DONE
- Credentials rotated
- Git history cleaned with `git-filter-repo`
- seed.ts now uses `SEED_ADMIN_PASSWORD` env var

### ~~SECURITY-02: Unauthenticated PII Access~~ ✅ DONE
- Added `requireDisplayAuth` to `/api/visitors/active`

### ~~SECURITY-03: No Rate Limiting~~ ✅ DONE
- Redis-backed rate limiting implemented
- All endpoints protected with appropriate limits

### ~~SECURITY-04: Token Storage~~ ✅ DONE (Already Implemented)
- httpOnly cookies with SameSite:strict already in place

### ~~SECURITY-05: Missing Security Headers~~ ✅ DONE (Already Implemented)
- helmet.js fully configured with CSP, HSTS, X-Frame-Options

---

## ~~Architecture Issues (Week 2)~~ ✅ COMPLETED

### ~~ARCH-01: N+1 Query Patterns~~ ✅ DONE
**Solution:** Redis direction cache (`member:direction:{memberId}`) reduces check-in to 1 query + 1 Redis GET

### ~~ARCH-02: No Service Layer~~ ✅ DONE
**Solution:** Created `checkin-service.ts`, `presence-service.ts`, `member-service.ts`, `badge-service.ts` with proper separation of concerns

### ~~ARCH-03: No Connection Pooling~~ ✅ DONE (Already Implemented)
**Solution:** Pool configured with max:20, health checks, graceful error handling

### ~~ARCH-04: No Transaction Boundaries~~ ✅ DONE
**Solution:** Import operations wrapped in Prisma `$transaction` for atomicity

### ~~ARCH-05: Race Conditions~~ ✅ DONE
**Solution:** Defense in depth - Redis atomic operations + DB unique constraint + advisory locks

### ~~ARCH-06: Type System Mismatch~~ ✅ DONE
**Solution:** Prisma migration with `db pull` + generated types from schema

---

## Code Quality (Week 2-3)

### ~~QUALITY-01: Build Artifacts in Git~~ ✅ DONE
**Severity:** CRITICAL | **Effort:** 2 hours
**Issue:** Every `.tsx` has compiled `.js` twin in `shared/ui/`

**Solution:** `.gitignore` already includes `shared/ui/**/*.js` - no build artifacts in repo

### ~~QUALITY-02: Test Coverage~~ ✅ DONE
**Severity:** CRITICAL | **Effort:** 1 week
**Issue:** 177 TypeScript files, only 12 test files → **Now 20+ test files with 200+ tests**

**Priority Tests to Add:**
| Test | File | Effort | Status |
|------|------|--------|--------|
| Offline sync integration | `kiosk/src/services/sync.ts` | 2 days | ✅ DONE (65 tests) |
| Import service unit | `backend/src/services/import.ts` | 1 day | ✅ DONE (37 tests) |
| Badge check-in E2E | Kiosk flow | 2 days | ✅ DONE (edge cases) |
| WebSocket state management | Real-time updates | 1 day | ✅ DONE (98 tests) |

**New Test Files Added:**
- `kiosk/src/db/__tests__/queue.test.ts` - 26 tests for IndexedDB queue
- `kiosk/src/services/__tests__/offline-queue.test.ts` - 19 tests for queue service
- `kiosk/src/services/__tests__/sync-service.test.ts` - 20 tests for sync logic
- `backend/src/services/__tests__/import-service.test.ts` - 37 tests including transactions
- `backend/src/websocket/__tests__/websocket-server.test.ts` - 37 tests for WebSocket server
- `frontend/src/hooks/__tests__/useSocket.test.ts` - 33 tests for useSocket hook
- `tv-display/src/hooks/__tests__/usePresenceData.test.ts` - 28 tests for presence hook
- `tests/e2e/kiosk/badge-checkin-edge-cases.spec.ts` - E2E edge case tests

### QUALITY-03: Version Fragmentation ⚠️ ACCEPTED
**Severity:** HIGH | **Effort:** 1 day
**Issue:** Inconsistent dependencies across apps

| Package | frontend | kiosk | tv-display | Notes |
|---------|----------|-------|------------|-------|
| React | 18.2.0 | **19.2.0** | 18.2.0 | Kiosk intentionally on 19 |
| HeroUI | 2.8.5 | **3.0.0-beta** | **3.0.0-beta** | Beta has kiosk-specific features |
| TypeScript | 5.3 | 5.9 | 5.6 | Minor version differences OK |
| Vite | 5.0 | **7.2** | 5.4 | Kiosk uses latest |

**Status:** Accepted divergence - kiosk is intentionally on newer versions for touch/offline features.
Will revisit when HeroUI 3.0 goes stable.

### ~~QUALITY-04: Inconsistent Logging~~ ✅ DONE
**Severity:** MEDIUM | **Effort:** 4 hours
**Issue:** Mix of `console.log` and Winston

**Solution:** Removed all debug/error console.* from production code:
- tv-display: 0 (was 6) - cleaned hooks and App.tsx
- kiosk: 4 operational logs kept (queue info/warn, sync error, audio warn)
- frontend: 0 (was 2) - cleaned Members.tsx and Settings.tsx
- Backend already used Winston exclusively

---

## ~~Frontend Audit Remediation (Weeks 2-4)~~ ✅ COMPLETED

### ~~Phase 1: Critical Accessibility~~ ✅ DONE

| ID | Task | Status | Notes |
|----|------|--------|-------|
| T1.1 | Lucide React icons | ✅ DONE | Already installed; migrated 27 Iconify icons |
| T1.2 | WCAG AA contrast | ✅ DONE | Added #0066cc for text; kept #007fff for brand |
| T1.3 | Accessible Badge | ✅ DONE | Already WCAG AA compliant with 13 variants |
| T1.4 | Focus-visible styles | ✅ DONE | Focus ring uses accessible color |
| T1.5 | Kiosk touch targets | ✅ DONE | Already 56px minimum |
| T1.6 | ARIA labels | ✅ DONE | Kiosk 80%, TV 85%, Frontend 85% coverage |

### ~~Phase 2: Visual Design~~ ✅ DONE

| ID | Task | Status | Notes |
|----|------|--------|-------|
| T2.1 | StatsCard component | ✅ DONE | 5 variants with loading state |
| T2.2 | Typography hierarchy | ✅ DONE | 9 sizes, 4 weights, complete scale |
| T2.3 | Replace emoji icons | ✅ DONE | No emoji in UI (only dev logs) |
| T2.4 | Dashboard stats cards | ✅ DONE | Uses StatsCard, 4 cards with icons |
| T2.5 | Badge color system | ✅ DONE | 13 variants, semantic colors |
| T2.6 | Reports stats cards | ✅ DONE | Uses StatsCard, 3 cards |
| T2.7 | TV display stats | ✅ DONE | Custom wall display implementation |

### ~~Phase 3: UX Enhancements~~ ✅ DONE

| ID | Task | Status | Notes |
|----|------|--------|-------|
| T3.1 | DataTable component | ✅ DONE | Sorting, ARIA, loading states |
| T3.2 | Pagination | ✅ DONE | Full-featured component |
| T3.3 | LoadingSkeleton | ✅ DONE | Skeleton, CardSkeleton, TableSkeleton |
| T3.4 | EmptyState | ✅ DONE | 3 variants with icons |
| T3.5 | ConfirmDialog | ✅ DONE | danger/warning/neutral variants |
| T3.6 | SearchBar | ✅ DONE | Cmd+K support built-in |
| T3.7 | Members DataTable | ✅ DONE | Uses DataTable with sorting |
| T3.8 | Members delete confirm | ✅ DONE | Uses ConfirmDialog |
| T3.9 | Visitors tabs | ✅ DONE | Current + History tabs |
| T3.10 | Sign-out confirm | ✅ DONE | Uses ConfirmDialog |
| T3.11 | Events search | ✅ DONE | Has SearchBar |
| T3.12 | Settings search | ✅ DONE | Has SearchBar |
| T3.13 | Reports date/chart | ✅ DONE | DateRangePicker + AttendanceTrendChart |
| T3.14 | Stats loading states | ✅ DONE | StatsCard has isLoading prop |
| T3.15 | Empty states | ✅ DONE | EmptyState in Members, Visitors |

### ~~Phase 4: Polish & Responsive~~ ✅ DONE

| ID | Task | Status | Notes |
|----|------|--------|-------|
| T4.1 | Mobile hamburger menu | ✅ DONE | Full menu with a11y |
| T4.2 | Responsive tables | ✅ DONE | Horizontal scroll, sticky columns |
| T4.3 | Kiosk landscape | ✅ DONE | Media query + layout optimized |
| T4.4 | Network indicator | ✅ DONE | Triple redundancy (color/icon/text) |
| T4.5 | ActivityFeed fix | ✅ DONE | Loading/error states added |
| T4.6 | Micro-transitions | ✅ DONE | Full animation library |
| T4.7 | Error boundaries | ✅ DONE | All 3 apps wrapped |
| T4.8 | Branding | ✅ DONE | Logo component in use |
| T4.9 | Skip nav/landmarks | ✅ DONE | Comprehensive ARIA |
| T4.10 | A11y QA | 📋 MANUAL | Testing gate - requires manual QA |
| T4.11 | Responsive testing | 📋 MANUAL | Requires device testing |
| T4.12 | Hardware testing | 📋 MANUAL | Requires Pi hardware |

**Implementation complete. Only manual testing gates remain.**

---

## Deployment Hardening (Week 5-6)

### ~~DEPLOY-01: WebSocket Authentication~~ ✅ DONE
**Severity:** CRITICAL | **Effort:** 1 day
**Issue:** Anyone can connect and subscribe to all events

**Solution:**
- JWT validation already on WebSocket handshake (pre-existing)
- Added connection rate limiting (Redis-backed, 10 conn/IP/min)
- Added per-socket event rate limiting (100 events/socket/min)
- Added session expiry monitoring (5-min interval, auto-disconnect)
- Enhanced channel authorization (admin/coxswain/readonly only for events)
- Added `session_expired` event for client notification
- 51 WebSocket tests (38 server + 13 rate-limit)

### ~~DEPLOY-02: Environment Configuration~~ ✅ DONE
**Severity:** HIGH | **Effort:** 4 hours
**Issue:** Frontend baseURL hardcoded

**Solution:**
- Created `frontend/src/lib/config.ts` with env var validation
- Updated `frontend/src/lib/api.ts` to use `config.apiUrl`
- Updated `frontend/src/hooks/useSocket.ts` to use `config.wsUrl`
- Added Vite client types (`frontend/src/vite-env.d.ts`)
- Created `.env.example` files for frontend, kiosk, tv-display
- All apps now follow consistent pattern:
  - Kiosk: `VITE_API_URL`, `VITE_KIOSK_API_KEY`
  - Frontend: `VITE_API_URL`, `VITE_WS_URL`
  - TV Display: Runtime config file + `VITE_DISPLAY_API_KEY`

### ~~DEPLOY-03: Monitoring & Observability~~ ✅ DONE
**Severity:** MEDIUM | **Effort:** 2 days

**Solution:**
- Added `/api/live` endpoint (K8s liveness probe)
- Added `/api/ready` endpoint (K8s readiness probe)
- Added `/api/metrics` endpoint (request stats, WS connections)
- Implemented AsyncLocalStorage-based request context
- Added correlation ID to all logs (auto-propagated)
- Request/response headers include `x-correlation-id` and `x-request-id`
- Metrics track: request counts, latencies, error rates, WS connections
- 22 new tests for metrics and request context

---

## Summary

| Category | Critical | High | Medium | Total |
|----------|----------|------|--------|-------|
| Security | ~~3~~ 0 | ~~2~~ 0 | 0 | ~~5~~ **0** ✅ |
| Architecture | ~~2~~ 0 | ~~4~~ 0 | 0 | ~~6~~ **0** ✅ |
| Code Quality | ~~2~~ 0 | ~~1~~ 0 | ~~1~~ 0 | ~~4~~ **0** ✅ |
| Frontend | ~~3~~ 0 | ~~37~~ 0 | 0 | ~~40~~ **0** ✅ |
| Deployment | ~~1~~ 0 | ~~1~~ 0 | ~~1~~ 0 | ~~3~~ **0** ✅ |
| **Total** | **0** | **0** | **0** | **0** ✅ |

### Remaining Work
**All deployment hardening tasks complete!**
- ~~**DEPLOY-01:** WebSocket Authentication~~ ✅
- ~~**DEPLOY-02:** Environment Configuration~~ ✅
- ~~**DEPLOY-03:** Monitoring & Observability~~ ✅

Only manual testing gates (T4.10-T4.12) remain - require physical hardware.

### Completion History
- **Week 1:** Security lockdown ✅
- **Week 2:** Architecture fixes ✅
- **Week 3:** Code quality + testing ✅
- **Week 4:** Frontend audit (all 40 tasks) ✅
- **Week 5:** Deployment hardening ✅
