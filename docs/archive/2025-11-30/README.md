# Sentinel Documentation Guide

**Quick Links:**
- 🏗️ **[Archive Assessment Report](./ARCHIVE-ASSESSMENT-REPORT.md)** - Complete archive/cleanup recommendations
- 📋 **[System Reviews](./reviews/)** - Latest system health assessment (Nov 29)
- 🎯 **[Frontend Audit Remediation Plan](./plans/frontend-audit-remediation/)** - Active implementation roadmap
- 🏛️ **[Architecture Analysis](./FRONTEND-ARCHITECTURE-ANALYSIS.md)** - System design overview

---

## Documentation Categories

### 📊 System Assessment (Current - Nov 29)

Latest comprehensive evaluation of system readiness for production deployment.

| Document | Purpose | Status |
|----------|---------|--------|
| [FINAL-CONSENSUS-REPORT.md](./reviews/FINAL-CONSENSUS-REPORT.md) | Overall system health (D+ rating, 55/100) | ⚠️ NOT READY |
| [architecture-review.md](./reviews/architecture-review.md) | 8 CRITICAL + 12 HIGH severity architectural issues | URGENT |
| [code-quality-review.md](./reviews/code-quality-review.md) | Code standards, testing gaps, maintainability | REVIEW |
| [security-review.md](./reviews/security-review.md) | Security vulnerabilities & hardening needs | CRITICAL |
| [frontend-review.md](./reviews/frontend-review.md) | UI/UX assessment & improvements | ONGOING |
| [cross-critique.md](./reviews/cross-critique.md) | Cross-functional analysis summary | CONTEXT |

**Key Takeaway:** System needs 6 weeks of intensive work (security, data integrity, testing) before production deployment.

---

### 🎯 Active Implementation Plans

Ongoing roadmaps for in-progress initiatives.

| Plan | Timeline | Status | Effort |
|------|----------|--------|--------|
| [Frontend Audit Remediation](./plans/frontend-audit-remediation/) | 2-3 weeks | READY | 43 tasks |
| [Database Integrity (HIGH-9)](./archive/active-investigations/fk-constraints/) | 4-6 hours | BLOCKED | FK constraints |
| [Token Security (HIGH-10)](./archive/active-investigations/token-security/) | 2-3 days | PLANNED | localStorage → httpOnly |
| [Query Optimization (N+1)](./archive/active-investigations/query-optimization/) | 1-2 days | READY | N+1 fixes + sorting |

---

### 🎨 Design System & Foundations

Permanent references for consistent UI development.

| Document | Purpose | Updated |
|----------|---------|---------|
| [FRONTEND-ARCHITECTURE-ANALYSIS.md](./FRONTEND-ARCHITECTURE-ANALYSIS.md) | Complete frontend architecture (Admin, Kiosk, TV) | Nov 28 |
| [accessibility-audit.md](./accessibility-audit.md) | WCAG AA compliance status | Nov 28 |
| [accessibility/focus-visible-implementation.md](./accessibility/focus-visible-implementation.md) | Focus indicator specs | CURRENT |
| [design-system/badge-usage.md](./design-system/badge-usage.md) | Component usage guide | CURRENT |

---

### 📦 Archive & Legacy

Completed work and past investigations.

| Location | Contents | Purpose |
|----------|----------|---------|
| [archive/legacy/](./archive/legacy/) | 18 files | Completed features (nominal roll, HeroUI migration) |
| [archive/active-investigations/](./archive/active-investigations/) | 8 files | In-progress investigations (FK, tokens, queries) |

**Note:** Investigation files are archived by topic to preserve context while keeping main docs clean.

---

## For Different Audiences

### 👨‍💼 Project Managers & Decision Makers

1. **Start with:** [FINAL-CONSENSUS-REPORT.md](./reviews/FINAL-CONSENSUS-REPORT.md) (system health verdict)
2. **Then review:** [Frontend Audit Remediation Plan](./plans/frontend-audit-remediation/EXECUTIVE-SUMMARY.md) (what's being done)
3. **Timeline:** Review all `/reviews/` for blocking issues
4. **Decision:** Need to unblock security & data integrity work before feature work

### 👨‍💻 Backend Developers

1. **Architecture:** [architecture-review.md](./reviews/architecture-review.md) (critical issues, design patterns)
2. **Current Work:**
   - [FK Constraints (HIGH-9)](./archive/active-investigations/fk-constraints/) - Data integrity
   - [Query Optimization](./archive/active-investigations/query-optimization/) - Performance
   - [Token Security (HIGH-10)](./archive/active-investigations/token-security/) - Security
3. **Design:** [FRONTEND-ARCHITECTURE-ANALYSIS.md](./FRONTEND-ARCHITECTURE-ANALYSIS.md) (API contracts)

### 🎨 Frontend Developers

1. **Design System:** [design-system/badge-usage.md](./design-system/badge-usage.md) & [focus-visible-implementation.md](./accessibility/focus-visible-implementation.md)
2. **Current Work:** [Frontend Audit Remediation Plan](./plans/frontend-audit-remediation/) (43 tasks across 4 phases)
3. **Architecture:** [FRONTEND-ARCHITECTURE-ANALYSIS.md](./FRONTEND-ARCHITECTURE-ANALYSIS.md) (component structure)
4. **Accessibility:** [accessibility-audit.md](./accessibility-audit.md) (WCAG AA issues to fix)

### 🔒 Security & DevOps

1. **Critical Issues:** [security-review.md](./reviews/security-review.md) (hardcoded secrets, auth, rate limiting)
2. **Architecture Risks:** [architecture-review.md](./reviews/architecture-review.md) (WebSocket auth, transaction boundaries)
3. **Blocking:** [Token Security (HIGH-10)](./archive/active-investigations/token-security/) (localStorage vulnerability)

---

## Investigation Status Dashboard

Current active investigations and their status:

| Issue | Topic | Status | Next Step |
|-------|-------|--------|-----------|
| HIGH-9 | FK Constraints (Data Integrity) | ⏸️ BLOCKED | Awaiting approval to proceed |
| HIGH-10 | Token Storage (Security) | ⏸️ PLANNED | Begin implementation |
| HIGH-4 | Client Sorting | ✅ READY | Implement in frontend |
| N+1 Queries | Query Optimization | ✅ READY | Implement in backend |

See [archive/active-investigations/INDEX.md](./archive/active-investigations/INDEX.md) for full details.

---

## Quick Start

**I need to...**

- **Understand system readiness** → Read [FINAL-CONSENSUS-REPORT.md](./reviews/FINAL-CONSENSUS-REPORT.md) + [security-review.md](./reviews/security-review.md)
- **Implement frontend fixes** → Go to [plans/frontend-audit-remediation/](./plans/frontend-audit-remediation/)
- **Fix database issues** → Check [archive/active-investigations/fk-constraints/](./archive/active-investigations/fk-constraints/)
- **Optimize queries** → See [archive/active-investigations/query-optimization/](./archive/active-investigations/query-optimization/)
- **Understand architecture** → Read [FRONTEND-ARCHITECTURE-ANALYSIS.md](./FRONTEND-ARCHITECTURE-ANALYSIS.md)
- **Learn design system** → Review [design-system/badge-usage.md](./design-system/badge-usage.md)

---

## Documentation Maintenance

See [ARCHIVE-ASSESSMENT-REPORT.md](./ARCHIVE-ASSESSMENT-REPORT.md) for:
- Complete archive/cleanup recommendations
- What to move, keep, or delete
- Guidelines for future documentation

**Last Updated:** November 30, 2025
