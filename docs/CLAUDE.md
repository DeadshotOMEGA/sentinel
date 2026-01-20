# Sentinel Documentation System (AI-First)

**Purpose:** AI-optimized documentation navigation and loading strategy for Claude Code

**AI Context Priority:** high

**Token Budget:** ~500 tokens (quick reference layer)

---

## Quick Reference (Layer 1)

### What Is This?

Comprehensive documentation system for Sentinel RFID Attendance Tracking, organized by:
1. **Diátaxis framework** - Tutorials, how-tos, reference, explanation
2. **Domain-driven structure** - Authentication, personnel, checkin, events
3. **Lifecycle management** - Plans, research, sessions with staleness tracking

### When to Load This

- User asks "where is documentation about X"
- User wants to create new documentation
- User needs to understand documentation organization
- Starting any documentation-related task

### AI Loading Strategy

**Load immediately:**
- This file (navigation hub)
- Relevant subdirectory CLAUDE.md (context-specific)

**Load on-demand:**
- Specific documents user requests
- Related concepts via links

**Never auto-load:**
- All documents at once (token waste)
- Archived/superseded documents

---

## Directory Structure (Layer 2)

### Primary Organization

```
docs/
├── README.md                    # Human-friendly navigation
├── CLAUDE.md                    # AI-first guide (this file)
│
├── domains/                     # Business domain docs
│   ├── authentication/          # Auth, sessions, API keys
│   ├── personnel/               # Members, divisions, ranks
│   ├── checkin/                # Badge scanning, presence
│   └── events/                 # Visitors, temporary access
│
├── cross-cutting/              # System-wide concerns
│   ├── testing/                # Test strategy, patterns
│   ├── deployment/             # CI/CD, infrastructure
│   └── monitoring/             # Logs, metrics, alerts
│
├── guides/                     # Diátaxis-organized
│   ├── tutorials/              # Learning-oriented
│   ├── howto/                  # Task-oriented
│   ├── reference/              # Information-oriented
│   └── explanation/            # Understanding-oriented
│
├── decisions/                  # Governance
│   ├── adr/                    # Architecture Decision Records
│   └── rfc/                    # Request for Comments
│
├── plans/                      # Implementation plans
│   ├── active/                 # Currently executing
│   └── completed/              # Historical
│
├── research/                   # Investigation docs
├── sessions/                   # Session reports
├── concepts/                   # Atomic concept definitions
├── templates/                  # Document templates
└── meta/                       # Documentation about docs
```

### Navigation Logic

**By task type:**
- Learn something → `guides/tutorials/`
- Do something → `guides/howto/`
- Look up specification → `guides/reference/`
- Understand concept → `guides/explanation/`

**By business domain:**
- Auth/sessions → `domains/authentication/`
- Members/divisions → `domains/personnel/`
- Badge scanning → `domains/checkin/`
- Visitors/events → `domains/events/`

**By system concern:**
- Testing → `cross-cutting/testing/`
- Deployment → `cross-cutting/deployment/`
- Monitoring → `cross-cutting/monitoring/`

**By decision/planning:**
- Architecture decisions → `decisions/adr/`
- Proposals → `decisions/rfc/`
- Implementation plans → `plans/active/`
- Research findings → `research/`

---

## File Naming Conventions (Layer 2)

### General Rules

1. **kebab-case only** - `integration-testing.md` not `IntegrationTesting.md`
2. **Descriptive, specific** - `howto-add-repository.md` not `repository.md`
3. **Avoid abbreviations** - `api-reference.md` not `api-ref.md`
4. **Singular concepts** - `repository-pattern.md` not `repositories-pattern.md`

### By Document Type

| Type | Pattern | Example |
|------|---------|---------|
| Tutorial | `tutorial-[topic].md` or `[topic].md` | `getting-started.md` |
| How-to | `howto-[task].md` or `[task].md` | `howto-add-repository.md` |
| Reference | `[subject]-reference.md` | `api-reference.md` |
| Explanation | `[concept].md` | `testing-philosophy.md` |
| ADR | `NNNN-title.md` | `0001-integration-testing.md` |
| RFC | `YYYY-MM-DD-title.md` | `2026-01-15-backend-rebuild.md` |
| Plan | `YYYY-MM-DD-plan-name.md` | `2026-01-19-doc-system.md` |
| Research | `YYYY-MM-DD-topic.md` | `2026-01-15-testcontainers.md` |
| Session | `YYYY-MM-DD-description.md` | `2026-01-19-enum-migration.md` |
| Concept | `simple-noun-phrase.md` | `repository-pattern.md` |

**Special files:**
- `CLAUDE.md` - Always uppercase, one per directory
- `index.md` - List of documents in section
- `README.md` - Human-friendly (root only)

**See:** [File Naming Conventions](plans/active/ai-first-documentation-system.md#file-naming-conventions) for complete guide

---

## Document Metadata (Layer 2)

### Required Frontmatter

All documents must include:

```yaml
---
type: tutorial | howto | reference | explanation | adr | rfc | plan | research | session
title: "Document Title"
status: draft | review | published | deprecated
created: YYYY-MM-DD
last_updated: YYYY-MM-DD
---
```

### AI-First Metadata (Optional but Recommended)

```yaml
---
# ... standard frontmatter ...
ai:
  priority: high | medium | low | reference-only
  context_load: always | on-demand | never
  triggers:
    - keyword1
    - keyword2
  token_budget: 500
---
```

**AI Usage:**
- `priority: high` + `context_load: always` → Load for all tasks in domain
- `priority: medium` + `context_load: on-demand` → Load when triggers match
- `priority: low` + `context_load: never` → Only load if directly referenced

### Temporal Documents (Plans, Research, Sessions)

Add lifecycle tracking:

```yaml
---
# ... standard frontmatter ...
lifecycle: active | completed | archived | superseded
reviewed: YYYY-MM-DD
expires: YYYY-MM-DD
superseded_by: path/to/newer-doc.md
related_code:
  - path/to/code/
---
```

---

## Diátaxis Classification (Layer 2)

### The Four Types

**Tutorial** - Learning-oriented
- Teaches concepts through practice
- Step-by-step for beginners
- Safe environment
- Example: "Learn testing by writing your first test"

**How-to** - Task-oriented
- Solves specific problem
- Assumes familiarity
- Minimal explanation
- Example: "How to add a new repository"

**Reference** - Information-oriented
- Complete specification
- Organized by structure
- Tables, parameters, types
- Example: "API Endpoints Reference"

**Explanation** - Understanding-oriented
- Conceptual understanding
- Rationale and alternatives
- Narrative format
- Example: "Why integration-first testing"

### Classification Rules

**Never mix types** in one document. If content spans types:
1. Split into separate documents
2. Link between them
3. Each gets correct classification

**Decision trees:**
- Teaching something new? → Tutorial
- Solving specific task? → How-to
- Listing specifications? → Reference
- Explaining concepts/why? → Explanation

---

## AI Context Loading Strategy (Layer 3)

### Progressive Loading

**Layer 1 (100-200 tokens) - Always load:**
- This CLAUDE.md file
- Relevant subdirectory CLAUDE.md
- Quick reference sections

**Layer 2 (500-1000 tokens) - Load on-demand:**
- Detailed guides when task requires
- Related concepts via links
- Examples and patterns

**Layer 3 (2000+ tokens) - Load rarely:**
- Complete references
- Troubleshooting sections
- Historical context

### Trigger-Based Loading

Load documents when user message contains trigger keywords:

**Example:**
```yaml
triggers:
  - repository
  - database
  - prisma
```

If user says "how do I add a repository", load docs with "repository" trigger.

### Context Budget

Total context for documentation should stay under:
- Simple tasks: 1000 tokens
- Medium tasks: 3000 tokens
- Complex tasks: 5000 tokens

Use atomic docs and links to stay efficient.

---

## Creating New Documentation (Layer 3)

### Step-by-Step Process

1. **Determine document type**
   - Use Diátaxis classification
   - One type per document

2. **Choose location**
   - Domain-specific → `domains/[domain]/`
   - Cross-cutting → `cross-cutting/[concern]/`
   - Tutorial/how-to/reference/explanation → `guides/[type]/`
   - Decision → `decisions/adr/` or `decisions/rfc/`
   - Plan → `plans/active/`
   - Research → `research/`
   - Session report → `sessions/`

3. **Use template**
   - Copy from `templates/[type].md`
   - Fill in frontmatter
   - Follow structure

4. **Follow naming convention**
   - See table above
   - kebab-case
   - Descriptive

5. **Add frontmatter**
   - Required fields
   - AI metadata
   - Lifecycle (if temporal)

6. **Cross-reference**
   - Link to related docs
   - Update indices

7. **Validate**
   - Run doc-validator (when available)
   - Check broken links
   - Verify naming

### Quick Templates

**Tutorial:**
```bash
cp docs/templates/tutorial.md docs/guides/tutorials/your-tutorial.md
```

**How-to:**
```bash
cp docs/templates/howto.md docs/guides/howto/your-howto.md
```

**ADR:**
```bash
cp docs/templates/adr.md docs/decisions/adr/0001-your-decision.md
```

**Plan:**
```bash
cp docs/templates/plan.md docs/plans/active/2026-01-20-your-plan.md
```

---

## Finding Documentation (Layer 3)

### By Task

**User asks: "How do I X?"**
→ Search `guides/howto/` and domain directories

**User asks: "What is X?"**
→ Search `concepts/` and `guides/explanation/`

**User asks: "What are the specs for X?"**
→ Search `guides/reference/` and domain directories

**User asks: "Why do we X?"**
→ Search `guides/explanation/` and `decisions/adr/`

### By Keyword

**Authentication, login, sessions, API keys:**
→ `domains/authentication/`

**Members, personnel, divisions, ranks:**
→ `domains/personnel/`

**Check-in, badge, scan, presence:**
→ `domains/checkin/`

**Visitors, events, temporary access:**
→ `domains/events/`

**Testing, coverage, integration tests:**
→ `cross-cutting/testing/`

**Deployment, CI/CD, Docker, Kubernetes:**
→ `cross-cutting/deployment/`

**Monitoring, logs, metrics, alerts:**
→ `cross-cutting/monitoring/`

### By Status

**Current implementation work:**
→ `plans/active/`

**Historical decisions:**
→ `decisions/adr/`

**Completed work:**
→ `plans/completed/` and `sessions/`

**Active proposals:**
→ `decisions/rfc/`

---

## Examples (Layer 3)

### Good Documentation Patterns

**✅ Atomic concept:**
```markdown
<!-- concepts/repository-pattern.md -->
# Repository Pattern

Brief definition (100 words).

## When to Use
- Scenario 1
- Scenario 2

## Example
[Code example]

## Related
- [Service Pattern](service-pattern.md)
- [How to Add Repository](../guides/howto/add-repository.md)
```

**✅ Domain how-to:**
```markdown
<!-- domains/authentication/howto-implement-login.md -->
---
type: howto
title: "How to Implement Login"
ai:
  triggers: [login, authentication, signin]
---

# How to Implement Login

Steps only, minimal explanation.

## Related
- [Auth Architecture](explanation-auth-architecture.md)
- [Auth API Reference](reference-auth-api.md)
```

### Anti-Patterns

**❌ Mixed Diátaxis types:**
```markdown
<!-- BAD: mixes tutorial, reference, and explanation -->
# Authentication Guide

This tutorial will teach you about authentication...
[tutorial content]

## API Reference
[reference tables]

## Why We Use Better-Auth
[explanation content]
```

**Fix:** Split into 3 separate documents

**❌ Poor naming:**
```markdown
auth.md           # Too vague
auth-stuff.md     # Unprofessional
authentication-tutorial-guide-complete.md  # Too long
```

**Fix:** `howto-implement-login.md`, `auth-architecture.md`

**❌ Missing frontmatter:**
```markdown
# Some Document

Content without metadata...
```

**Fix:** Always include frontmatter with type, status, dates

---

## Related Documentation

**Complete specification:**
- [AI-First Documentation System Plan](plans/active/ai-first-documentation-system.md)

**Style guides:**
- [Style Guide](meta/style-guide.md)
- [AI-First Principles](meta/ai-first-principles.md)
- [Diátaxis Guide](meta/diataxis-guide.md)
- [Health Tracking](meta/health-tracking.md)

**Templates:**
- [Template Index](templates/CLAUDE.md)

---

## Subdirectory CLAUDE.md Files

Each subdirectory has its own CLAUDE.md with:
- What goes in that specific directory
- When to create docs there
- Format requirements
- Examples
- Anti-patterns

**Load these contextually** when working in specific areas:
- `domains/authentication/CLAUDE.md` - When working on auth
- `cross-cutting/testing/CLAUDE.md` - When working on tests
- `guides/howto/CLAUDE.md` - When creating how-to guides
- etc.

---

**Last Updated:** 2026-01-19
