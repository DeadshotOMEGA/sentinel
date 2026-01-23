# CLAUDE Rules: Documentation System

## Scope

Applies when creating or navigating documentation in: `docs/`

## Non-Negotiables (MUST / MUST NOT)

**File Naming**:

- MUST use kebab-case only
- MUST be descriptive and specific
- MUST NOT abbreviate (use `api-reference.md` not `api-ref.md`)

**Document Classification**:

- MUST use Diátaxis framework (tutorial, howto, reference, explanation)
- MUST NOT mix types in single document
- MUST include complete frontmatter with type, status, created, last_updated

**Directory Organization**:

- MUST place docs in correct subdirectory (domain, cross-cutting, guides, decisions, plans)
- MUST use `domains/` for business-specific features
- MUST use `cross-cutting/` for system-wide concerns
- MUST use `guides/` for Diátaxis-organized content

**Metadata**:

- MUST include frontmatter: type, title, status, created, last_updated
- MUST add lifecycle fields for temporal docs (plans, research, sessions)
- SHOULD include AI metadata (priority, triggers)

## Defaults (SHOULD)

**When Creating Docs**:

- SHOULD start with template from `templates/`
- SHOULD update relevant index.md files
- SHOULD cross-reference related documents
- SHOULD use atomic concepts (200-500 tokens) in `concepts/`

## Workflow

**When creating new documentation**:

1. Determine document type (Diátaxis: tutorial, howto, reference, explanation)
2. Choose location (domain, cross-cutting, guides, decisions, plans)
3. Copy template from `templates/[type].md`
4. Update frontmatter completely
5. Cross-reference related docs
6. Update index.md

**File naming patterns**:

- Tutorial: `[topic].md` (e.g., `getting-started.md`)
- How-to: `howto-[task].md` (e.g., `howto-add-repository.md`)
- Reference: `[subject]-reference.md` (e.g., `api-reference.md`)
- Explanation: `[concept].md` (e.g., `testing-philosophy.md`)
- ADR: `NNNN-title.md` (e.g., `0001-integration-testing.md`)
- RFC: `YYYY-MM-DD-title.md` (e.g., `2026-01-15-backend-rebuild.md`)
- Plan: `YYYY-MM-DD-name.md` (e.g., `2026-01-19-doc-system.md`)
- Research: `YYYY-MM-DD-topic.md` (e.g., `2026-01-15-testcontainers.md`)
- Session: `YYYY-MM-DD-description.md` (e.g., `2026-01-19-enum-migration.md`)
- Concept: `simple-noun-phrase.md` (e.g., `repository-pattern.md`)
