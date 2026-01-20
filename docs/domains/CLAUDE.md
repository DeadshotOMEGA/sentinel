# Domain Documentation (AI-First Guide)

**Purpose:** Business domain organization guide

**AI Context Priority:** medium

**When to Load:** User choosing where to document domain-specific features

---

## Quick Reference

### What's Here

Domain-driven documentation organized by business capability:
- **[Authentication](authentication/)** - Auth, sessions, API keys
- **[Personnel](personnel/)** - Members, divisions, ranks
- **[Check-in](checkin/)** - Badge scanning, presence
- **[Events](events/)** - Visitors, temporary access

### When to Use Domains

**Use domain directories when:**
- Documentation is specific to one business area
- Multiple document types needed for same domain
- Feature spans multiple technical layers
- Business logic concentrated in one area

**Use cross-cutting when:**
- Feature affects multiple domains
- System-wide concerns (testing, deployment)
- Infrastructure patterns

---

## Domain Organization

### Structure

Each domain directory contains:
```
domains/[domain-name]/
├── CLAUDE.md                        # Domain guide
├── explanation-[topic].md           # Why/how domain works
├── reference-[subject].md           # API specs, data models
└── howto-[task].md                  # Practical tasks
```

### File Naming

**Use type prefix** in domain directories:
- `explanation-auth-architecture.md` (not just `architecture.md`)
- `reference-member-api.md` (not just `api.md`)
- `howto-assign-badge.md` (clear task name)

**Why:** Multiple doc types coexist in same directory

---

## Domain Guides

### Authentication Domain
**What:** User auth, sessions, API keys
**Code:** `apps/backend/src/lib/auth.ts`, middleware, routes
**Key Features:** better-auth, JWT, API keys for kiosks
**See:** [Authentication CLAUDE.md](authentication/CLAUDE.md)

### Personnel Domain
**What:** Members, divisions, ranks, badges
**Code:** Member/division/badge repositories, services, routes
**Key Features:** Bulk import, badge assignment, hierarchy
**See:** [Personnel CLAUDE.md](personnel/CLAUDE.md)

### Check-in Domain
**What:** Badge scanning, presence tracking, real-time updates
**Code:** Checkin repository, direction detection, WebSocket
**Key Features:** IN/OUT detection, WebSocket broadcasts, activity history
**See:** [Check-in CLAUDE.md](checkin/CLAUDE.md)

### Events Domain
**What:** Visitors, event access, temporary permissions
**Code:** Visitor/event repositories, attendee management
**Key Features:** Sign-in/out, event registration, attendance tracking
**See:** [Events CLAUDE.md](events/CLAUDE.md)

---

## Adding New Domains

### When to Create New Domain

**Create new domain when:**
- Distinct business capability emerges
- Feature set grows beyond single domain
- Clear bounded context identified
- Domain experts can own the docs

**Example:** If you added inventory management, create `domains/inventory/`

### Setup Steps

1. Create directory: `docs/domains/[new-domain]/`
2. Copy CLAUDE.md from similar domain
3. Customize sections
4. Add to this index
5. Update root README.md

---

## Domain vs. Cross-Cutting

### Domain Documentation

**Characteristics:**
- Business-focused
- Single-domain concern
- Domain-specific APIs
- Business rules

**Example:** "How member badge assignment works" → Personnel domain

### Cross-Cutting Documentation

**Characteristics:**
- Technical-focused
- Multi-domain concern
- Infrastructure patterns
- System-wide practices

**Example:** "How integration testing works" → Cross-cutting/Testing

### Decision Guide

```
Is this specific to one business area?
├─ Yes → Domain directory
└─ No → Cross-cutting directory

Does this affect multiple domains?
├─ Yes → Cross-cutting directory
└─ No → Domain directory

Is this about business logic or infrastructure?
├─ Business logic → Domain
└─ Infrastructure → Cross-cutting
```

---

## Related Documentation

**Cross-cutting concerns:**
- [Testing](../cross-cutting/testing/CLAUDE.md)
- [Deployment](../cross-cutting/deployment/CLAUDE.md)
- [Monitoring](../cross-cutting/monitoring/CLAUDE.md)

**Guides:**
- [How-to Guides](../guides/howto/CLAUDE.md)
- [Reference Docs](../guides/reference/CLAUDE.md)

**Root:**
- [Documentation System](../CLAUDE.md)

---

**Last Updated:** 2026-01-19
