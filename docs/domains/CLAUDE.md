# CLAUDE Rules: Domain Documentation

## Scope
Applies when creating documentation in: `docs/domains/`

## Non-Negotiables (MUST / MUST NOT)

**Content Type**:
- MUST document business domain-specific features
- MUST be specific to one business area (NOT system-wide)
- MUST follow Diátaxis classification within domain directories
- MUST use type prefixes in filenames (`explanation-`, `reference-`, `howto-`)

**File Naming**:
- MUST use type prefix: `explanation-auth-architecture.md`, `reference-member-api.md`
- MUST use kebab-case
- MUST NOT use generic names (`architecture.md` → `explanation-auth-architecture.md`)

## Defaults (SHOULD)

**Organization**:
- SHOULD include domain CLAUDE.md for navigation
- SHOULD mix all Diátaxis types within domain directory
- SHOULD cross-reference related cross-cutting documentation

## Workflow

**When documenting domain feature**:
1. Verify it's specific to ONE business area (authentication, personnel, checkin, events)
2. Choose appropriate domain subdirectory
3. Use type-prefixed filename
4. Follow Diátaxis classification (tutorial, howto, reference, explanation)
5. Link from domain CLAUDE.md

**When unsure if domain or cross-cutting**:
- Specific to single business area → Use `docs/domains/`
- Affects multiple domains → Use `docs/cross-cutting/`
- Business logic → Use `docs/domains/`
- Infrastructure pattern → Use `docs/cross-cutting/`

## Quick Reference

**Domains**:
- [Authentication](authentication/CLAUDE.md) - Auth, sessions, API keys
- [Personnel](personnel/CLAUDE.md) - Members, divisions, ranks
- [Check-in](checkin/CLAUDE.md) - Badge scanning, presence
- [Events](events/CLAUDE.md) - Visitors, temporary access

**Decision Guide**:
```
Is this specific to one business area?
├─ Yes → Domain directory
└─ No → Cross-cutting directory

Does this affect multiple domains?
├─ Yes → Cross-cutting directory
└─ No → Domain directory

Is this business logic or infrastructure?
├─ Business logic → Domain
└─ Infrastructure → Cross-cutting
```

**Related**:
- [Cross-Cutting](../cross-cutting/CLAUDE.md) - System-wide concerns
- [Guides](../guides/CLAUDE.md) - Diátaxis organization
