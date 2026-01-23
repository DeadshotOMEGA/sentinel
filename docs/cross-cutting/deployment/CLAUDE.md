# CLAUDE Rules: Deployment Documentation

## Scope

Applies when creating documentation in: `docs/cross-cutting/deployment/`

## Non-Negotiables (MUST / MUST NOT)

**Content Type**:

- MUST document CI/CD, infrastructure, and release processes
- MUST be system-wide deployment concerns (NOT domain-specific)
- MUST follow Diátaxis classification (tutorial, howto, reference, explanation)
- MUST use kebab-case filenames

**Documentation Placement**:

- MUST use cross-cutting/deployment/ for infrastructure affecting all domains
- MUST NOT mix deployment with domain-specific business logic
- MUST include complete frontmatter with type, status, dates

## Defaults (SHOULD)

**Content Coverage**:

- SHOULD document CI/CD pipelines (GitHub Actions)
- SHOULD document Docker containerization
- SHOULD document release processes
- SHOULD document environment configuration

**Organization**:

- SHOULD separate explanation (why), how-to (steps), and reference (specs)
- SHOULD link to related monitoring and testing documentation

## Workflow

**When documenting deployment topic**:

1. Verify it affects multiple domains (NOT domain-specific)
2. Choose appropriate Diátaxis type (tutorial, howto, reference, explanation)
3. Use template from `@docs/templates/`
4. Add frontmatter with AI triggers
5. Link from this file's Quick Reference

**When unsure if deployment**:

- Single domain process → Use `docs/domains/`
- System-wide infrastructure → Use `docs/cross-cutting/deployment/`

## Quick Reference

**Key Topics**:

- CI/CD Pipeline (GitHub Actions workflows)
- Docker Setup (multi-stage builds, images)
- Environment Configuration (dev, staging, prod)
- Release Process (semantic versioning, changelogs)
- Health Monitoring (deployment verification)
