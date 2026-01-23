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

- SHOULD include domain-specific rules in directory
- SHOULD mix all Diátaxis types within domain directory
- SHOULD cross-reference related cross-cutting documentation

## Workflow

**When documenting domain feature**:

1. Verify it's specific to ONE business area (authentication, personnel, checkin, events)
2. Choose appropriate domain subdirectory
3. Use type-prefixed filename
4. Follow Diátaxis classification (tutorial, howto, reference, explanation)
5. Update index.md if applicable

**When unsure if domain or cross-cutting**:

- Specific to single business area → Use `docs/domains/`
- Affects multiple domains → Use `docs/cross-cutting/`
- Business logic → Use `docs/domains/`
- Infrastructure pattern → Use `docs/cross-cutting/`

## Quick Reference

**Subdirectories**: `authentication/`, `personnel/`, `checkin/`, `events/`

**Decision Guide**:

- Specific to ONE business area → Use domain directory
- Affects MULTIPLE domains → Use cross-cutting directory
- Business logic → Domain directory
- Infrastructure patterns → Cross-cutting directory
