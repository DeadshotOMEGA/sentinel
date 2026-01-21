# Sentinel Documentation System (AI-First)

**Purpose:** AI-optimized documentation navigation and loading strategy

**AI Context Priority:** high

**Token Budget:** ~500 tokens (quick reference layer)

---

## Scope
Applies when creating or navigating documentation in: `docs/`

## Non-Negotiables (MUST / MUST NOT)

**File Naming**:
- MUST use kebab-case only
- MUST be descriptive and specific
- MUST NOT abbreviate (use `api-reference.md` not `api-ref.md`)
- MUST follow type-specific patterns (see Quick Reference below)

**Document Classification**:
- MUST use Diátaxis framework (tutorial, howto, reference, explanation)
- MUST NOT mix types in single document
- MUST include complete frontmatter with type, status, dates

**Directory Organization**:
- MUST place docs in correct subdirectory (domain vs cross-cutting vs guides)
- MUST use `domains/` for business-specific features
- MUST use `cross-cutting/` for system-wide concerns
- MUST use `guides/` for Diátaxis-organized content

**Metadata**:
- MUST include frontmatter: type, title, status, created, last_updated
- MUST add lifecycle fields for temporal docs (plans, research, sessions)
- SHOULD include AI metadata (priority, context_load, triggers)

## Defaults (SHOULD)

**When Creating Docs**:
- SHOULD start with template from `templates/CLAUDE.md`
- SHOULD update relevant index.md files
- SHOULD cross-reference related documents
- SHOULD use atomic concepts (200-500 tokens) in `concepts/`

**Organization**:
- SHOULD load subdirectory CLAUDE.md contextually
- SHOULD use progressive loading (Layer 1 → Layer 2 → Layer 3)
- SHOULD keep token budget under 5000 for complex tasks

## Workflow

**When creating new documentation**:
1. Determine document type (Diátaxis: tutorial, howto, reference, explanation)
2. Choose location (domain, cross-cutting, guides, decisions, plans)
3. Copy template from `templates/[type].md`
4. Follow file naming pattern (see Quick Reference)
5. Update frontmatter completely
6. Cross-reference related docs
7. Update index.md

**When loading documentation**:
- Load this CLAUDE.md (navigation hub)
- Load relevant subdirectory CLAUDE.md (context-specific)
- Load specific documents on-demand
- Never auto-load all documents (token waste)

## Quick Reference

### Directory Structure

```
docs/
├── domains/              # Business features
│   ├── authentication/   # Auth, sessions, API keys
│   ├── personnel/        # Members, divisions, ranks
│   ├── checkin/         # Badge scanning, presence
│   └── events/          # Visitors, temporary access
├── cross-cutting/       # System-wide concerns
│   ├── testing/         # Test strategy, patterns
│   ├── deployment/      # CI/CD, infrastructure
│   └── monitoring/      # Logs, metrics, alerts
├── guides/              # Diátaxis-organized
│   ├── tutorials/       # Learning-oriented
│   ├── howto/          # Task-oriented
│   ├── reference/      # Information-oriented
│   └── explanation/    # Understanding-oriented
├── decisions/          # Governance
│   ├── adr/           # Architecture Decision Records
│   └── rfc/           # Request for Comments
├── plans/             # Implementation plans
│   ├── active/        # Currently executing
│   └── completed/     # Historical
├── research/          # Investigation docs
├── sessions/          # Session reports
├── concepts/          # Atomic concept definitions
├── templates/         # Document templates
└── meta/             # Documentation about docs
```

### File Naming Patterns

| Type | Pattern | Example |
|------|---------|---------|
| Tutorial | `[topic].md` | `getting-started.md` |
| How-to | `howto-[task].md` | `howto-add-repository.md` |
| Reference | `[subject]-reference.md` | `api-reference.md` |
| Explanation | `[concept].md` | `testing-philosophy.md` |
| ADR | `NNNN-title.md` | `0001-integration-testing.md` |
| RFC | `YYYY-MM-DD-title.md` | `2026-01-15-backend-rebuild.md` |
| Plan | `YYYY-MM-DD-name.md` | `2026-01-19-doc-system.md` |
| Research | `YYYY-MM-DD-topic.md` | `2026-01-15-testcontainers.md` |
| Session | `YYYY-MM-DD-description.md` | `2026-01-19-enum-migration.md` |
| Concept | `simple-noun-phrase.md` | `repository-pattern.md` |

### Navigation by Task

**Learn something** → `guides/tutorials/`
**Do something** → `guides/howto/`
**Look up specification** → `guides/reference/`
**Understand concept** → `guides/explanation/`

### Navigation by Domain

**Auth/sessions** → `domains/authentication/`
**Members/divisions** → `domains/personnel/`
**Badge scanning** → `domains/checkin/`
**Visitors/events** → `domains/events/`

### Navigation by System Concern

**Testing** → `cross-cutting/testing/`
**Deployment** → `cross-cutting/deployment/`
**Monitoring** → `cross-cutting/monitoring/`

### Navigation by Decision/Planning

**Architecture decisions** → `decisions/adr/`
**Proposals** → `decisions/rfc/`
**Active plans** → `plans/active/`
**Research** → `research/`

---

## Subdirectory CLAUDE.md Files

Each subdirectory has context-specific rules. Load these when working in specific areas:

- [domains/authentication/CLAUDE.md](domains/authentication/CLAUDE.md)
- [domains/personnel/CLAUDE.md](domains/personnel/CLAUDE.md)
- [domains/checkin/CLAUDE.md](domains/checkin/CLAUDE.md)
- [domains/events/CLAUDE.md](domains/events/CLAUDE.md)
- [cross-cutting/testing/CLAUDE.md](cross-cutting/testing/CLAUDE.md)
- [cross-cutting/deployment/CLAUDE.md](cross-cutting/deployment/CLAUDE.md)
- [cross-cutting/monitoring/CLAUDE.md](cross-cutting/monitoring/CLAUDE.md)
- [guides/tutorials/CLAUDE.md](guides/tutorials/CLAUDE.md)
- [guides/howto/CLAUDE.md](guides/howto/CLAUDE.md)
- [guides/reference/CLAUDE.md](guides/reference/CLAUDE.md)
- [guides/explanation/CLAUDE.md](guides/explanation/CLAUDE.md)
- [decisions/adr/CLAUDE.md](decisions/adr/CLAUDE.md)
- [decisions/rfc/CLAUDE.md](decisions/rfc/CLAUDE.md)
- [plans/CLAUDE.md](plans/CLAUDE.md)
- [templates/CLAUDE.md](templates/CLAUDE.md)
- [research/CLAUDE.md](research/CLAUDE.md)
- [sessions/CLAUDE.md](sessions/CLAUDE.md)
- [concepts/CLAUDE.md](concepts/CLAUDE.md)
- [meta/CLAUDE.md](meta/CLAUDE.md)

---

**Last Updated:** 2026-01-20
