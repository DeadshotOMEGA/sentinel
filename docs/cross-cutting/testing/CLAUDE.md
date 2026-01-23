# CLAUDE Rules: Testing Documentation

## Scope

Applies when creating documentation in: `docs/cross-cutting/testing/`

## Non-Negotiables (MUST / MUST NOT)

**Content Type**:

- MUST document test strategy, patterns, and coverage
- MUST be system-wide testing concerns (NOT domain-specific)
- MUST follow Diátaxis classification (tutorial, howto, reference, explanation)
- MUST use kebab-case filenames

**Testing Philosophy**:

- MUST emphasize integration-first approach with real database
- MUST document coverage targets (Repos: 90%+, Services: 85%+, Routes: 80%+)
- MUST NOT promote mocking over real integration tests

## Defaults (SHOULD)

**Content Coverage**:

- SHOULD document integration-first philosophy and rationale
- SHOULD document Testcontainers setup and usage
- SHOULD document repository, service, and route testing patterns
- SHOULD document coverage monitoring and enforcement

**Organization**:

- SHOULD separate philosophy (explanation), patterns (reference), and guides (howto)
- SHOULD link to actual test code examples

## Workflow

**When documenting testing topic**:

1. Verify it applies across domains (NOT domain-specific)
2. Choose appropriate Diátaxis type (tutorial, howto, reference, explanation)
3. Use template from `@docs/templates/`
4. Add frontmatter with AI triggers (test, testing, coverage, integration, testcontainers)
5. Link from this file's Quick Reference

**When unsure if cross-cutting**:

- Single domain testing → Document in that domain's directory
- System-wide strategy → Use `docs/cross-cutting/testing/`

## Quick Reference

**Key Principle**: Integration-first with real database via Testcontainers

**Coverage Targets**:

- Repositories: 90%+
- Services: 85%+
- Routes: 80%+
- Overall: 80%+

**Test Infrastructure**:

- [TestDatabase class](../../../../apps/backend/tests/helpers/testcontainers.ts)
- [Factory functions](../../../../apps/backend/tests/helpers/factories.ts)
- [Vitest config](../../../../apps/backend/vitest.config.ts)
