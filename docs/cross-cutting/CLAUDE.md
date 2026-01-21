# CLAUDE Rules: Cross-Cutting Concerns

## Scope
Applies when creating documentation in: `docs/cross-cutting/`

## Non-Negotiables (MUST / MUST NOT)

**Documentation Placement**:
- MUST use cross-cutting for system-wide technical concerns (NOT domain-specific)
- MUST follow Diátaxis classification (tutorial, howto, reference, explanation)
- MUST include complete frontmatter with type, status, dates
- MUST use kebab-case for filenames

**File Naming**:
- MUST prefix with type: `explanation-`, `howto-`, `reference-`
- MUST NOT abbreviate words in filenames

## Defaults (SHOULD)

**Content**:
- SHOULD use templates from `@docs/templates/`
- SHOULD cross-reference related domain docs
- SHOULD keep explanations focused on patterns (not implementations)

**Organization**:
- SHOULD organize by concern type: testing, deployment, monitoring
- SHOULD link to code examples in codebase

## Workflow

**When documenting cross-cutting concern**:
1. Verify it affects multiple domains (not domain-specific)
2. Choose concern subdirectory: testing/, deployment/, monitoring/
3. Use appropriate template from `@docs/templates/`
4. Add frontmatter with AI triggers
5. Link from subdirectory CLAUDE.md

**When unsure if cross-cutting**:
- Affects single domain → Use `docs/domains/`
- Business-specific logic → Use `docs/domains/`
- System-wide pattern → Use `docs/cross-cutting/`

## Quick Reference

**Concerns**:
- [Testing](testing/CLAUDE.md) - Test strategy, patterns, coverage
- [Deployment](deployment/CLAUDE.md) - CI/CD, infrastructure, releases
- [Monitoring](monitoring/CLAUDE.md) - Logs, metrics, alerts

**Templates**: `@docs/templates/`

**Related**:
- [Domains](../domains/CLAUDE.md) - Business domain documentation
- [Guides](../guides/CLAUDE.md) - Diátaxis-organized guides
