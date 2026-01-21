# CLAUDE Rules: Authentication Domain

## Scope
Applies when creating documentation in: `docs/domains/authentication/`

## Non-Negotiables (MUST / MUST NOT)

**Content Type**:
- MUST document authentication, sessions, and API key features
- MUST be auth domain-specific (NOT cross-cutting security or other domains)
- MUST follow Diátaxis classification (tutorial, howto, reference, explanation)
- MUST use type prefix in filenames

**File Naming**:
- MUST use format: `[type]-auth-[topic].md`
- MUST use kebab-case
- MUST NOT use generic names without type prefix

**Examples**:
- `explanation-auth-architecture.md`
- `reference-auth-api.md`
- `howto-implement-login.md`

**Documentation Placement**:
- MUST use `docs/domains/authentication/` for auth-specific features
- MUST NOT mix with cross-cutting security patterns
- MUST NOT mix with general middleware documentation

**Security Documentation**:
- MUST include security implications in explanations
- MUST document what NOT to do (anti-patterns)
- MUST link to security audit requirements when applicable
- MUST NOT commit secrets or sensitive data in examples

## Defaults (SHOULD)

**When to Create**:
- SHOULD create for login/logout flows
- SHOULD create for session management
- SHOULD create for API key workflows
- SHOULD NOT create for general security patterns (use cross-cutting)

**Organization**:
- SHOULD include complete frontmatter with type, status, dates
- SHOULD add security metadata for sensitive docs
- SHOULD link to better-auth implementation code
- SHOULD reference related ADRs for design decisions

**Security Metadata** (optional):
```yaml
security:
  sensitivity: high | medium | low
  contains_secrets: false
  requires_review: true
```

## Workflow

**When documenting auth feature**:
1. Determine document type (tutorial, howto, reference, explanation)
2. Create file with type prefix: `[type]-auth-[topic].md`
3. Use template from `@docs/templates/`
4. Include security considerations section
5. Link to `apps/backend/src/lib/auth.ts` and middleware
6. Add examples using real code (not pseudocode)
7. Cross-reference related ADRs

## Quick Reference

**Authentication Methods**:
- Admin: Email/password (JWT sessions, 7-day expiry)
- Kiosk: API keys (long-lived, rotatable)

**Code Locations**:
- Auth config: `apps/backend/src/lib/auth.ts`
- Middleware: `apps/backend/src/middleware/auth.ts`
- Routes: `apps/backend/src/routes/auth.ts`
- Schema: `packages/database/prisma/schema.prisma` (better-auth tables)

**Related Decisions**:
- [ADR-0002: better-auth Adoption](../../decisions/adr/0002-better-auth-adoption.md) (to be created)

**Cross-cutting**:
- [Security](../../cross-cutting/security/CLAUDE.md) (to be created)
- [Testing](../../cross-cutting/testing/CLAUDE.md)

**Templates**: `@docs/templates/CLAUDE.md`
