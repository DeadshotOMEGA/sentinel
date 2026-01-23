# CLAUDE Rules: Authentication Domain

## Scope

Applies when creating documentation in: `docs/domains/authentication/`

## Non-Negotiables (MUST / MUST NOT)

- MUST document authentication, sessions, and API key features only
- MUST follow Diátaxis classification with type prefix: `[type]-auth-[topic].md`
- MUST include security implications, anti-patterns, and audit links
- MUST NOT commit secrets or sensitive data
- MUST link to `apps/backend/src/lib/auth.ts` and middleware code

## Defaults (SHOULD)

- SHOULD create for login/logout, session management, API key workflows
- SHOULD include security metadata (sensitivity: high/medium/low)
- SHOULD reference related ADRs

## Workflow

1. Determine type (tutorial, howto, reference, explanation)
2. Create `[type]-auth-[topic].md` file
3. Include security considerations section
4. Add examples using real code, cross-reference ADRs
