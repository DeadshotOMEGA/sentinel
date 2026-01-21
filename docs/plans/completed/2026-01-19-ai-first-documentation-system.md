---
type: plan
title: "AI-First Documentation System Implementation Plan"
status: active
created: 2026-01-19
last_updated: 2026-01-19
lifecycle: active
reviewed: 2026-01-19
expires: 2026-02-19
ai:
  priority: high
  context_load: always
  triggers:
    - documentation
    - docs
    - ai-first
    - claude
    - diátaxis
    - progressive-disclosure
  token_budget: 2500
related_code:
  - docs/
phase: "Pre-Phase 2 (Documentation Infrastructure)"
related_plans:
  - backend-rebuild-plan.md
---

# AI-First Documentation System Implementation Plan

## Executive Summary

Implement a comprehensive AI-first documentation system for the Sentinel project that prioritizes machine readability while remaining human-friendly. This system will establish clear organizational patterns, lifecycle management, and health tracking for all documentation.

**Key Principles:**
1. **AI-First:** Documentation optimized for Claude Code and AI systems
2. **Progressive Disclosure:** Hierarchical information loading (quick → detailed → complete)
3. **Atomic Documentation:** One concept per document, densely linked
4. **Lifecycle Management:** Track creation, review, staleness, and deprecation
5. **Domain-Driven:** Organize by business domains matching monorepo structure

**Timeline:** 1-2 days (pre-implementation planning phase)

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Problems Being Solved](#problems-being-solved)
3. [Core Documentation Frameworks](#core-documentation-frameworks)
4. [Proposed Directory Structure](#proposed-directory-structure)
5. [File Naming Conventions](#file-naming-conventions)
6. [Implementation Phases](#implementation-phases)
7. [CLAUDE.md Specifications](#claudemd-specifications)
8. [Document Templates](#document-templates)
9. [Style Guide Enhancements](#style-guide-enhancements)
10. [Health Tracking System](#health-tracking-system)
11. [Success Metrics](#success-metrics)
12. [Migration Strategy](#migration-strategy)

---

## Current State Analysis

### What We Have

**Existing Documentation:**
- `docs/plans/backend-rebuild-plan.md` - Active implementation plan
- `.claude/sessions/2026-01-19-enum-repositories-and-fk-migration.md` - Session report
- Various CLAUDE.md files scattered in packages/apps
- `.claude/rules/*.md` - Global Claude Code rules

**Existing Structure:**
```
sentinel/
├── docs/
│   └── plans/
│       └── backend-rebuild-plan.md
└── .claude/
    ├── rules/
    └── sessions/
```

**Strengths:**
- Active use of session reports
- CLAUDE.md files for code context
- Clear planning documents

**Gaps:**
- No formal documentation system
- No organization by doc type
- No lifecycle tracking
- No health monitoring
- No templates
- Mixed purposes in single docs
- No AI-first optimization

---

## Problems Being Solved

### 1. **Discovery Problem**
- **Current:** Docs scattered, hard to find
- **Solution:** Organized by domain + type, clear indices

### 2. **Context Loading Problem**
- **Current:** AI loads entire large docs (token waste)
- **Solution:** Progressive disclosure, atomic docs, priority metadata

### 3. **Staleness Problem**
- **Current:** No tracking when docs become outdated
- **Solution:** Lifecycle metadata, health monitoring, auto-alerts

### 4. **Mixed Purpose Problem**
- **Current:** Docs mix tutorials, reference, explanations
- **Solution:** Strict Diátaxis classification

### 5. **Temporal Doc Confusion**
- **Current:** Plans/research/sessions mixed with guides
- **Solution:** Separate lifecycle for temporal docs

### 6. **AI Comprehension Problem**
- **Current:** Docs written for humans only
- **Solution:** AI-first structure, triggers, priority metadata

---

## Core Documentation Frameworks

### 1. Diátaxis (Primary Framework)

**Four document types:**

| Type | Purpose | Audience | When to Create |
|------|---------|----------|----------------|
| **Tutorial** | Learning-oriented | Beginners | New major features |
| **How-to** | Task-oriented | Practitioners | Repeated questions (3+) |
| **Reference** | Information-oriented | Lookup | API/config exists |
| **Explanation** | Understanding-oriented | Decision-makers | Complex architecture |

**Rules:**
- One type per document (never mix)
- If content spans types, split into multiple docs and link
- Each type has specific template and structure

### 2. Progressive Disclosure (AI Optimization)

**Three information layers:**

```markdown
# Layer 1: Quick Reference (100-200 tokens)
TL;DR, essential commands, common patterns

# Layer 2: Detailed Guide (500-1000 tokens)
Step-by-step instructions, explanations, examples

# Layer 3: Complete Reference (2000+ tokens)
Every option, every edge case, troubleshooting
```

**AI Loading Strategy:**
- Load Layer 1 for all related tasks
- Load Layer 2 on-demand when detailed guidance needed
- Load Layer 3 only when explicitly requested

### 3. Atomic Documentation (Zettelkasten-inspired)

**Principles:**
- **One concept per document** (200-500 tokens ideal)
- **Dense linking** between related concepts
- **Reusable** across multiple guides
- **Composable** into larger narratives

**Example:**
```
concepts/integration-testing.md (atomic)
  ↓ referenced by
howto/write-repository-tests.md
howto/write-service-tests.md
explanation/testing-philosophy.md
```

**Benefits:**
- AI loads exactly what's needed
- Easier to maintain (smaller surface area)
- Context reuse across documents

### 4. Domain-Driven Organization

**Organize by business domain:**

```
domains/
├── authentication/     # Auth domain
├── personnel/         # Members, divisions
├── checkin/          # Badge scanning, presence
└── events/           # Temporary access, visitors
```

**Matches:**
- Monorepo package structure
- Business bounded contexts
- Team ownership

### 5. Document Lifecycle Management

**For temporal docs (plans, research, sessions):**

```yaml
lifecycle: active | completed | archived | superseded
created: YYYY-MM-DD
reviewed: YYYY-MM-DD
expires: YYYY-MM-DD
```

**States:**
- **Active:** Currently relevant, being executed
- **Completed:** Finished, kept for history
- **Archived:** Historical, not actively used
- **Superseded:** Replaced by newer version

---

## Proposed Directory Structure

```
sentinel/
├── docs/
│   ├── README.md                        # Central index, navigation
│   ├── CLAUDE.md                        # How to use this docs system (AI-first)
│   │
│   ├── domains/                         # Domain-specific documentation
│   │   ├── CLAUDE.md                   # Domain organization, when to use
│   │   ├── authentication/
│   │   │   ├── CLAUDE.md               # Auth domain overview
│   │   │   ├── explanation.md          # Why better-auth
│   │   │   ├── reference.md            # Auth API reference
│   │   │   ├── howto-login.md         # Login implementation
│   │   │   └── howto-api-keys.md      # API key management
│   │   ├── personnel/
│   │   │   ├── CLAUDE.md
│   │   │   ├── explanation.md          # Member management concepts
│   │   │   ├── reference.md            # Member API
│   │   │   └── howto-add-member.md
│   │   ├── checkin/
│   │   │   ├── CLAUDE.md
│   │   │   ├── explanation.md          # Checkin flow logic
│   │   │   ├── reference.md            # Checkin API
│   │   │   └── howto-badge-scan.md
│   │   └── events/
│   │       ├── CLAUDE.md
│   │       └── ...
│   │
│   ├── cross-cutting/                   # Cross-domain concerns
│   │   ├── CLAUDE.md                   # When to use vs domains/
│   │   ├── testing/
│   │   │   ├── CLAUDE.md
│   │   │   ├── explanation-integration-first.md
│   │   │   ├── reference-coverage-targets.md
│   │   │   ├── howto-repository-tests.md
│   │   │   └── howto-service-tests.md
│   │   ├── deployment/
│   │   │   ├── CLAUDE.md
│   │   │   └── ...
│   │   └── monitoring/
│   │       ├── CLAUDE.md
│   │       └── ...
│   │
│   ├── guides/                          # Diátaxis-organized guides
│   │   ├── CLAUDE.md                   # Diátaxis rules, classification
│   │   ├── tutorials/
│   │   │   ├── CLAUDE.md               # Tutorial writing guide
│   │   │   ├── getting-started.md      # First-time setup
│   │   │   └── build-first-feature.md
│   │   ├── howto/
│   │   │   ├── CLAUDE.md               # How-to writing guide
│   │   │   ├── add-repository.md
│   │   │   ├── add-route.md
│   │   │   └── run-tests.md
│   │   ├── reference/
│   │   │   ├── CLAUDE.md               # Reference writing guide
│   │   │   ├── api-endpoints.md
│   │   │   ├── environment-variables.md
│   │   │   └── database-schema.md
│   │   └── explanation/
│   │       ├── CLAUDE.md               # Explanation writing guide
│   │       ├── architecture.md
│   │       ├── monorepo-structure.md
│   │       └── testing-philosophy.md
│   │
│   ├── decisions/                       # Governance & decisions
│   │   ├── CLAUDE.md                   # ADR/RFC lifecycle, when to create
│   │   ├── adr/                        # Architecture Decision Records
│   │   │   ├── CLAUDE.md               # ADR format, review process
│   │   │   ├── index.md                # ADR index with statuses
│   │   │   ├── 0001-integration-first-testing.md
│   │   │   ├── 0002-better-auth.md
│   │   │   └── 0003-ts-rest-contracts.md
│   │   └── rfc/                        # Request for Comments
│   │       ├── CLAUDE.md               # RFC format, consensus process
│   │       ├── index.md                # RFC index
│   │       └── 2026-01-15-backend-rebuild.md
│   │
│   ├── research/                        # Investigation & exploration
│   │   ├── CLAUDE.md                   # Research doc lifecycle, format
│   │   ├── index.md                    # Chronological + status index
│   │   ├── 2026-01-15-testcontainers-evaluation.md
│   │   └── 2026-01-18-orm-performance-comparison.md
│   │
│   ├── plans/                          # Implementation plans
│   │   ├── CLAUDE.md                   # Plan format, lifecycle, tracking
│   │   ├── index.md                    # Active/completed index
│   │   ├── active/
│   │   │   ├── backend-rebuild-plan.md
│   │   │   └── ai-first-documentation-system.md (THIS FILE)
│   │   └── completed/
│   │       └── phase-1-repositories.md
│   │
│   ├── sessions/                       # Session reports
│   │   ├── CLAUDE.md                   # Session report format, purpose
│   │   ├── index.md                    # Chronological index
│   │   ├── 2026-01-19-enum-repos.md
│   │   └── 2026-01-19-doc-system-planning.md
│   │
│   ├── concepts/                       # Atomic concept docs
│   │   ├── CLAUDE.md                   # Atomic doc principles
│   │   ├── integration-testing.md
│   │   ├── testcontainers.md
│   │   ├── repository-pattern.md
│   │   └── service-pattern.md
│   │
│   ├── templates/                      # Document templates
│   │   ├── CLAUDE.md                   # Template usage guide
│   │   ├── tutorial.md
│   │   ├── howto.md
│   │   ├── reference.md
│   │   ├── explanation.md
│   │   ├── adr.md
│   │   ├── rfc.md
│   │   ├── plan.md
│   │   ├── research.md
│   │   └── session-report.md
│   │
│   └── meta/                           # Documentation about docs
│       ├── CLAUDE.md                   # Meta-documentation purpose
│       ├── style-guide.md              # Complete style guide
│       ├── ai-first-principles.md      # AI-specific conventions
│       ├── health-tracking.md          # Health monitoring guide
│       └── diátaxis-guide.md           # Diátaxis classification guide
│
└── .claude/
    └── scripts/
        ├── doc-health.ts              # Health monitoring script
        ├── doc-validator.ts           # Validate frontmatter, links
        └── doc-index-generator.ts     # Auto-generate indices
```

---

## File Naming Conventions

### General Principles

**1. Use kebab-case for all files**
- ✅ `integration-testing.md`
- ❌ `IntegrationTesting.md`, `integration_testing.md`

**2. Be descriptive and specific**
- ✅ `howto-add-repository.md`
- ❌ `repository.md`, `repo-howto.md`

**3. Avoid abbreviations unless universally understood**
- ✅ `api-reference.md`, `adr-0001.md`
- ❌ `mbr-svc.md`, `chk-rpt.md`

**4. Use singular nouns for concepts, plural for collections**
- ✅ `concepts/repository-pattern.md`, `guides/tutorials/`
- ❌ `concepts/repositories-pattern.md`, `guides/tutorial/`

**5. File extensions**
- All documentation: `.md` (Markdown)
- Scripts: `.ts`, `.js`, `.sh`, `.py`
- Config: `.json`, `.yaml`, `.yml`

---

### Naming by Document Type

#### 1. Diátaxis Documents (Guides)

**Pattern:** `[type]-[topic].md` (type prefix only for clarity)

**Tutorials:**
- `tutorial-getting-started.md`
- `tutorial-first-feature.md`
- `tutorial-testing-basics.md`

**How-tos:**
- `howto-add-repository.md`
- `howto-write-tests.md`
- `howto-deploy-production.md`

**Reference:**
- `reference-api-endpoints.md`
- `reference-environment-variables.md`
- `reference-database-schema.md`
- Or simply: `api-reference.md`, `env-vars-reference.md`

**Explanation:**
- `explanation-testing-philosophy.md`
- `explanation-architecture.md`
- `explanation-monorepo-structure.md`
- Or simply: `testing-philosophy.md`, `architecture.md`

**Type prefix is optional** when context is clear:
- In `guides/tutorials/`: `getting-started.md` (tutorial prefix implied)
- In `guides/howto/`: `add-repository.md` (howto prefix implied)
- In `guides/reference/`: `api-endpoints.md` (reference prefix implied)
- In `guides/explanation/`: `testing-philosophy.md` (explanation prefix implied)

**Type prefix is required** when mixed in same directory:
- In `domains/authentication/`:
  - `explanation-auth-flow.md`
  - `reference-auth-api.md`
  - `howto-api-keys.md`

#### 2. Domain Documents

**Pattern:** Keep type prefix for clarity

**Format:** `[type]-[topic].md` or `[topic]-[type].md`

**Examples:**
```
domains/authentication/
├── CLAUDE.md
├── explanation-auth-architecture.md  # or auth-architecture.md
├── reference-auth-api.md             # or auth-api-reference.md
├── howto-implement-login.md
└── howto-manage-api-keys.md

domains/personnel/
├── CLAUDE.md
├── explanation-member-lifecycle.md
├── reference-member-api.md
├── howto-add-member.md
└── howto-assign-badge.md
```

**Guideline:** Use type prefix when multiple types exist in same directory

#### 3. Temporal Documents (Plans, Research, Sessions)

**Pattern:** `YYYY-MM-DD-descriptive-title.md`

**Why date prefix:** Chronological sorting, instant recognition

**Plans:**
- `2026-01-19-ai-first-documentation-system.md`
- `2026-01-15-backend-rebuild-plan.md`
- `2026-02-01-phase-2-infrastructure.md`

**Research:**
- `2026-01-15-testcontainers-evaluation.md`
- `2026-01-18-orm-performance-comparison.md`
- `2026-01-20-websocket-libraries-research.md`

**Sessions:**
- `2026-01-19-enum-repositories-migration.md`
- `2026-01-19-doc-system-planning.md`
- `2026-01-20-phase-2-kickoff.md`

**Exception:** Active plans can omit date if they're "living documents":
- `backend-rebuild-plan.md` (if actively updated)
- But prefer dated names for completed plans

#### 4. Architecture Decision Records (ADRs)

**Pattern:** `NNNN-short-title.md`

**Number:** Zero-padded 4 digits (0001, 0002, ..., 0123)

**Examples:**
- `0001-integration-first-testing.md`
- `0002-better-auth-adoption.md`
- `0003-ts-rest-contracts.md`
- `0004-monorepo-structure.md`

**Index file:** `index.md` (not `0000-index.md`)

#### 5. Request for Comments (RFCs)

**Pattern:** `YYYY-MM-DD-descriptive-title.md`

**Why:** RFCs are temporal - they're created, discussed, then decided

**Examples:**
- `2026-01-15-backend-rebuild-proposal.md`
- `2026-02-01-real-time-notifications.md`
- `2026-02-15-multi-tenant-architecture.md`

**Post-decision:** Create ADR referencing the RFC:
```markdown
# ADR-0005: Real-Time Notifications

**RFC:** [2026-02-01-real-time-notifications.md](../rfc/2026-02-01-real-time-notifications.md)
```

#### 6. Atomic Concept Documents

**Pattern:** `simple-noun-phrase.md`

**Rules:**
- Single concept per file
- 1-3 words max
- Descriptive, not clever

**Examples:**
- `integration-testing.md`
- `testcontainers.md`
- `repository-pattern.md`
- `service-pattern.md`
- `dependency-injection.md`
- `coverage-targets.md`

**Not:**
- ❌ `what-is-integration-testing.md` (too verbose)
- ❌ `integration-test.md` (use plural or full term)
- ❌ `int-testing.md` (avoid abbreviations)

#### 7. Special Files

**CLAUDE.md:**
- Always uppercase: `CLAUDE.md`
- One per directory (never subdirectories)
- Purpose: AI-first context and guidelines

**Index files:**
- `index.md` - List of documents with status/descriptions
- `README.md` - Human-friendly navigation (root only)

**Templates:**
- `[type].md` - e.g., `tutorial.md`, `howto.md`, `plan.md`
- No prefix/suffix needed in templates/ directory

---

### Naming by Section

#### `docs/domains/`
```
domains/[domain-name]/
├── CLAUDE.md
├── [type]-[topic].md        # Type prefix required
└── ...

Examples:
├── authentication/
│   ├── CLAUDE.md
│   ├── explanation-auth-architecture.md
│   ├── reference-auth-api.md
│   └── howto-implement-login.md
```

#### `docs/cross-cutting/`
```
cross-cutting/[concern]/
├── CLAUDE.md
├── [type]-[topic].md
└── ...

Examples:
├── testing/
│   ├── CLAUDE.md
│   ├── explanation-integration-first.md
│   ├── reference-coverage-targets.md
│   └── howto-write-repository-tests.md
```

#### `docs/guides/`
```
guides/[diátaxis-type]/
├── CLAUDE.md
├── [descriptive-name].md    # Type prefix optional (implied by directory)
└── ...

Examples:
├── tutorials/
│   ├── CLAUDE.md
│   ├── getting-started.md
│   └── first-feature.md
├── howto/
│   ├── CLAUDE.md
│   ├── add-repository.md
│   └── write-tests.md
```

#### `docs/decisions/adr/`
```
adr/
├── CLAUDE.md
├── index.md
├── 0001-short-title.md
├── 0002-another-title.md
└── ...
```

#### `docs/decisions/rfc/`
```
rfc/
├── CLAUDE.md
├── index.md
├── YYYY-MM-DD-descriptive-title.md
└── ...
```

#### `docs/plans/`
```
plans/
├── CLAUDE.md
├── index.md
├── active/
│   ├── YYYY-MM-DD-plan-name.md
│   └── backend-rebuild-plan.md    # Exception: living document
└── completed/
    ├── YYYY-MM-DD-plan-name.md
    └── ...
```

#### `docs/research/`
```
research/
├── CLAUDE.md
├── index.md
├── YYYY-MM-DD-topic.md
└── ...
```

#### `docs/sessions/`
```
sessions/
├── CLAUDE.md
├── index.md
├── YYYY-MM-DD-session-description.md
└── ...
```

#### `docs/concepts/`
```
concepts/
├── CLAUDE.md
├── simple-noun.md
├── another-concept.md
└── ...
```

#### `docs/templates/`
```
templates/
├── CLAUDE.md
├── tutorial.md
├── howto.md
├── reference.md
├── explanation.md
├── adr.md
├── rfc.md
├── plan.md
├── research.md
└── session-report.md
```

#### `docs/meta/`
```
meta/
├── CLAUDE.md
├── style-guide.md
├── ai-first-principles.md
├── health-tracking.md
└── diataxis-guide.md
```

---

### Quick Reference Table

| Document Type | Pattern | Example | Location |
|---------------|---------|---------|----------|
| **Tutorial** | `tutorial-[topic].md` or `[topic].md` | `tutorial-getting-started.md` | `guides/tutorials/` |
| **How-to** | `howto-[task].md` or `[task].md` | `howto-add-repository.md` | `guides/howto/`, `domains/*/` |
| **Reference** | `reference-[subject].md` or `[subject]-reference.md` | `api-reference.md` | `guides/reference/`, `domains/*/` |
| **Explanation** | `explanation-[concept].md` or `[concept].md` | `testing-philosophy.md` | `guides/explanation/`, `domains/*/` |
| **ADR** | `NNNN-short-title.md` | `0001-integration-testing.md` | `decisions/adr/` |
| **RFC** | `YYYY-MM-DD-title.md` | `2026-01-15-backend-rebuild.md` | `decisions/rfc/` |
| **Plan** | `YYYY-MM-DD-plan-name.md` | `2026-01-19-doc-system.md` | `plans/active/`, `plans/completed/` |
| **Research** | `YYYY-MM-DD-topic.md` | `2026-01-15-testcontainers.md` | `research/` |
| **Session** | `YYYY-MM-DD-description.md` | `2026-01-19-enum-migration.md` | `sessions/` |
| **Concept** | `simple-noun-phrase.md` | `repository-pattern.md` | `concepts/` |
| **CLAUDE.md** | `CLAUDE.md` (uppercase) | `CLAUDE.md` | Every directory |
| **Index** | `index.md` | `index.md` | Top of each section |
| **Template** | `[type].md` | `tutorial.md` | `templates/` |

---

### Validation Rules

**Automated checks (to be implemented in doc-validator.ts):**

1. ✅ All files use kebab-case
2. ✅ No spaces in filenames
3. ✅ CLAUDE.md is uppercase
4. ✅ ADRs follow NNNN-title.md pattern
5. ✅ Temporal docs have date prefix (YYYY-MM-DD)
6. ✅ No duplicate filenames across directories
7. ✅ File extension is .md for docs
8. ✅ Filenames match frontmatter title (similar)

**Warning checks:**
- ⚠️ Filename is too long (>60 chars)
- ⚠️ Filename contains abbreviations
- ⚠️ Filename doesn't clearly indicate content type

---

### Migration Notes

**Existing files to rename:**

1. `docs/plans/backend-rebuild-plan.md`
   - Keep as-is (living document exception)
   - OR rename to: `docs/plans/active/2026-01-15-backend-rebuild.md`

2. `.claude/sessions/2026-01-19-enum-repositories-and-fk-migration.md`
   - Rename to: `docs/sessions/2026-01-19-enum-repositories-migration.md`
   - (shorter, clearer)

3. Any future docs: follow naming conventions strictly

---

## Implementation Phases

### Phase 1: Directory Structure (Foundational)

**Goal:** Create all directories with CLAUDE.md files explaining purpose and usage

**Tasks:**
1. Create directory structure (see above)
2. Write CLAUDE.md for each directory with:
   - What this directory contains
   - When to create docs here
   - Format/structure requirements
   - How AI should use these docs
   - Examples of good docs
   - Anti-patterns to avoid
3. Create main `docs/README.md` as navigation hub
4. Create root `docs/CLAUDE.md` explaining entire system

**Deliverables:**
- [ ] All directories created
- [ ] 20+ CLAUDE.md files (one per directory)
- [ ] Root documentation index
- [ ] System overview CLAUDE.md

**Key CLAUDE.md Files:**
- `docs/CLAUDE.md` - System overview, how to navigate
- `docs/domains/CLAUDE.md` - Domain organization principles
- `docs/guides/CLAUDE.md` - Diátaxis rules
- `docs/plans/CLAUDE.md` - Plan lifecycle and tracking
- `docs/research/CLAUDE.md` - Research doc format
- `docs/sessions/CLAUDE.md` - Session report format
- `docs/templates/CLAUDE.md` - Template usage guide

### Phase 2: Reorganize Existing Documents

**Goal:** Move and enhance existing documentation to fit new structure

**Tasks:**
1. **Move Plans:**
   - `docs/plans/backend-rebuild-plan.md` → `docs/plans/active/backend-rebuild-plan.md`
   - This file → `docs/plans/active/2026-01-19-ai-first-documentation-system.md`
   - Add lifecycle metadata to both
   - Create `docs/plans/index.md`

2. **Move Session Reports:**
   - `.claude/sessions/*.md` → `docs/sessions/`
   - Add session metadata
   - Create `docs/sessions/index.md`

3. **Create Indices:**
   - `docs/plans/index.md` - Active/completed plans with status
   - `docs/sessions/index.md` - Chronological session list
   - `docs/research/index.md` - Research by status
   - `docs/decisions/adr/index.md` - ADR by status
   - `docs/decisions/rfc/index.md` - RFC by status

4. **Extract Existing Content:**
   - Backend rebuild plan has explanations → extract to `docs/cross-cutting/testing/explanation-integration-first.md`
   - Testing strategy rule → becomes multiple atomic docs

**Deliverables:**
- [ ] All existing docs moved to correct locations
- [ ] Lifecycle metadata added to temporal docs
- [ ] 5 index files created
- [ ] Extracted atomic concepts from existing docs

### Phase 3: Create Templates

**Goal:** Provide copy-paste templates for all document types

**Tasks:**
1. Create 9 templates in `docs/templates/`:
   - `tutorial.md` - Full tutorial template with frontmatter
   - `howto.md` - How-to guide template
   - `reference.md` - Reference doc template
   - `explanation.md` - Explanation template
   - `adr.md` - ADR template
   - `rfc.md` - RFC template
   - `plan.md` - Plan template
   - `research.md` - Research doc template
   - `session-report.md` - Session report template

2. Each template includes:
   - Complete frontmatter with all fields
   - Section structure
   - AI-first metadata (priority, triggers, context_load)
   - Examples of what to write in each section
   - Anti-patterns to avoid
   - Related document types

3. Create `docs/templates/CLAUDE.md` explaining:
   - When to use each template
   - How to fill out frontmatter
   - How to customize templates
   - Template validation rules

**Deliverables:**
- [ ] 9 complete templates
- [ ] Template usage guide (CLAUDE.md)
- [ ] Validation checklist for each template type

### Phase 4: Comprehensive Style Guide

**Goal:** Document all writing conventions and AI-first principles

**Tasks:**
1. Create `docs/meta/style-guide.md` with sections:
   - Diátaxis classification rules
   - Frontmatter standards
   - Markdown formatting conventions
   - Code block standards
   - Cross-referencing patterns
   - AI-first writing principles
   - Review process
   - Versioning and deprecation
   - Examples for each rule

2. Create `docs/meta/ai-first-principles.md`:
   - Progressive disclosure patterns
   - Token optimization strategies
   - Context priority system
   - Trigger keyword guidelines
   - Loading strategy recommendations

3. Create `docs/meta/health-tracking.md`:
   - Staleness calculation
   - Health metrics
   - Monitoring setup
   - CI/CD integration

4. Create `docs/meta/diátaxis-guide.md`:
   - Detailed classification guide
   - Edge case disambiguation
   - Tutorial vs. how-to decision tree
   - Reference vs. explanation decision tree
   - Multi-type document splitting strategies

**Deliverables:**
- [ ] Complete style guide
- [ ] AI-first principles doc
- [ ] Health tracking guide
- [ ] Diátaxis classification guide

---

## CLAUDE.md Specifications

### Purpose of CLAUDE.md Files

**Every directory gets a CLAUDE.md** that answers:
1. **What goes here?** - Content types, scope
2. **When to create docs here?** - Triggers, criteria
3. **What format?** - Structure requirements, templates
4. **How should AI use this?** - Loading strategy, context priority
5. **Examples** - 2-3 good examples
6. **Anti-patterns** - What NOT to do

### Standard CLAUDE.md Structure

```markdown
# [Directory Name] Documentation

**Purpose:** One-sentence purpose

**AI Context Priority:** high | medium | low | reference-only

---

## What Goes Here

[Description of content types]

## When to Create Docs Here

**Triggers:**
- Trigger 1
- Trigger 2

**Criteria:**
- Criterion 1
- Criterion 2

## Format Requirements

**Required Frontmatter:**
```yaml
---
# fields here
---
```

**Required Sections:**
1. Section 1
2. Section 2

## How AI Should Use This

**Loading Strategy:**
- Load when: [conditions]
- Load priority: [high/medium/low]
- Token budget: [estimate]

**Search Triggers:**
- Keywords that should trigger loading these docs

## Examples

### Good Example 1
[Path to example]
**Why it's good:** [explanation]

### Good Example 2
[Path to example]
**Why it's good:** [explanation]

## Anti-Patterns

### ❌ Anti-Pattern 1
**Problem:** [description]
**Why it's wrong:** [explanation]
**Correct approach:** [solution]

## Related Documentation

- [Related directory 1](path)
- [Related directory 2](path)
```

### Critical CLAUDE.md Files

#### 1. `docs/CLAUDE.md` (Root)

Must explain:
- Overall documentation philosophy (AI-first, Diátaxis, lifecycle)
- Directory structure overview
- How to find documentation (navigation patterns)
- Quick reference for common tasks
- Links to style guide and templates

#### 2. `docs/plans/CLAUDE.md`

Must explain:
- Plan vs. research vs. session report
- Plan lifecycle (active → completed/archived)
- When to create a plan
- Plan format and required sections
- How to track plan progress
- When to update/review plans
- Staleness detection for plans

Key content:
```markdown
## Plan Lifecycle

### States
- **Active:** Currently being executed
- **Completed:** Finished, moved to completed/
- **Archived:** No longer relevant
- **Superseded:** Replaced by newer plan

### Lifecycle Triggers

**Move to Completed when:**
- All deliverables complete
- Success metrics met
- No outstanding tasks

**Move to Archived when:**
- Plan cancelled or deprioritized
- Context changed making plan obsolete

**Mark as Superseded when:**
- New plan replaces this one
- Link to new plan in frontmatter

### Update Triggers

Update plan when:
- Scope changes
- New blockers discovered
- Timeline adjusts
- Dependencies change

Add update log at bottom:
```yaml
## Update Log

### 2026-01-20
- Added Phase 5 for monitoring
- Adjusted timeline +1 week

### 2026-01-19
- Initial creation
```

#### 3. `docs/research/CLAUDE.md`

Must explain:
- Research vs. plan vs. investigation
- Research lifecycle (active → archived)
- When to create research doc
- Research format (hypothesis, methodology, findings)
- How to convert research → decisions (ADRs)

#### 4. `docs/sessions/CLAUDE.md`

Must explain:
- Purpose of session reports (historical record, context)
- When to create session report (after significant work sessions)
- Session report format
- How to link sessions to plans/artifacts
- How AI uses session reports (understand project history)

#### 5. `docs/templates/CLAUDE.md`

Must explain:
- How to choose correct template
- How to fill out frontmatter
- How to customize templates for specific needs
- Template validation rules

---

## Document Templates

### Template Frontmatter Standards

**All Documents:**
```yaml
---
type: tutorial | howto | reference | explanation | adr | rfc | plan | research | session
title: "Document Title"
status: draft | review | published | deprecated
created: YYYY-MM-DD
last_updated: YYYY-MM-DD
---
```

**AI-First Metadata (optional but recommended):**
```yaml
---
# ... standard frontmatter ...
ai:
  priority: high | medium | low | reference-only
  context_load: always | on-demand | never
  triggers:
    - keyword1
    - keyword2
  token_budget: 500  # Estimated tokens
---
```

**Temporal Documents (plans, research, sessions):**
```yaml
---
# ... standard frontmatter ...
lifecycle: active | completed | archived | superseded
reviewed: YYYY-MM-DD
expires: YYYY-MM-DD  # When to review for staleness
superseded_by: path/to/newer-doc.md  # If superseded
related_code:
  - path/to/code/
  - apps/backend/src/
---
```

### Template Examples

#### Tutorial Template

```markdown
---
type: tutorial
title: "Tutorial: [Learning Goal]"
status: published
created: YYYY-MM-DD
last_updated: YYYY-MM-DD
ai:
  priority: medium
  context_load: on-demand
  triggers: [tutorial, learn, beginner]
  token_budget: 1000
---

# Tutorial: [Learning Goal]

**What you'll learn:** Brief outcome description (one sentence)

**Time:** ~X minutes

**Prerequisites:**
- Prerequisite 1 with [link](path/to/doc.md)
- Prerequisite 2

**Who this is for:** Beginners to [concept]

---

## Quick Reference (Layer 1)

Essential commands/concepts you'll use:
```bash
$ command1
$ command2
```

Key concepts: [concept1], [concept2]

---

## Step 1: [First Action]

**Goal:** What this step accomplishes

**Why:** Explanation of why this step is important

### Instructions

1. Do this:
   ```bash
   $ specific-command --with-flags
   ```

2. Verify it worked:
   ```bash
   $ verification-command
   ```

**Expected output:**
```
output here
```

**What's happening:** Explanation of what the system is doing

### Common Issues

| Problem | Cause | Solution |
|---------|-------|----------|
| Error X | Reason | Fix |

---

## Step 2: [Next Action]

[Same structure as Step 1]

---

## Step N: [Final Action]

[Same structure]

---

## Summary

You've learned:
- ✅ Skill 1
- ✅ Skill 2
- ✅ Skill 3

## Next Steps

**Continue learning:**
- [Next Tutorial](path/to/next.md)
- [Related Concepts](path/to/explanation.md)

**Apply what you learned:**
- [Practical How-to](path/to/howto.md)

**Reference:**
- [API Reference](path/to/reference.md)

---

## Troubleshooting

### Problem: [Common Issue]
**Symptoms:** What user sees
**Cause:** Why it happens
**Solution:** Step-by-step fix

### Problem: [Another Issue]
[Same structure]
```

#### Plan Template

```markdown
---
type: plan
title: "[Feature/Goal] Implementation Plan"
status: active
created: YYYY-MM-DD
last_updated: YYYY-MM-DD
lifecycle: active
reviewed: YYYY-MM-DD
expires: YYYY-MM-DD
related_code:
  - path/to/affected/code/
ai:
  priority: high
  context_load: always
  triggers: [plan, implementation, feature-name]
  token_budget: 2000
---

# [Feature/Goal] Implementation Plan

**Status:** Active | Completed | Archived | Superseded
**Phase:** [Current Phase]
**Timeline:** X weeks/days
**Related:** [Related Plan](path/to/related-plan.md)

---

## Executive Summary

One paragraph: what we're building, why, key changes

**Key Changes:**
- Change 1
- Change 2
- Change 3

**Timeline:** X weeks across Y phases

---

## Table of Contents

1. [Current State](#current-state)
2. [Goals](#goals)
3. [Non-Goals](#non-goals)
4. [Implementation Phases](#implementation-phases)
5. [Success Metrics](#success-metrics)
6. [Risks & Mitigations](#risks--mitigations)
7. [Dependencies](#dependencies)
8. [Progress Tracking](#progress-tracking)

---

## Current State

**What exists now:**
- Current feature 1
- Current feature 2

**Problems with current state:**
- Problem 1
- Problem 2

**What's changing:**
- Change 1: from X to Y
- Change 2: from A to B

---

## Goals

**Primary Goals:**
1. Goal 1 (measurable)
2. Goal 2 (measurable)

**Secondary Goals:**
1. Nice-to-have 1
2. Nice-to-have 2

---

## Non-Goals

**Explicitly out of scope:**
1. Non-goal 1 (might be in future)
2. Non-goal 2 (explain why)

---

## Implementation Phases

### Phase 1: [Name] (Timeline)

**Goal:** What this phase achieves

**Tasks:**
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

**Deliverables:**
- [ ] Deliverable 1
- [ ] Deliverable 2

**Success Criteria:**
- Criterion 1
- Criterion 2

**Files Changed:**
- `path/to/file1.ts` - New/Modified
- `path/to/file2.ts` - Modified

---

### Phase 2: [Name] (Timeline)

[Same structure as Phase 1]

---

## Success Metrics

### Technical Metrics
- Metric 1: Target value
- Metric 2: Target value

### Business Metrics
- Metric 1: Target value
- Metric 2: Target value

### Quality Metrics
- Test coverage: X%
- Performance: < Y ms
- Error rate: < Z%

---

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Risk 1 | High/Med/Low | High/Med/Low | How to prevent/handle |
| Risk 2 | High/Med/Low | High/Med/Low | How to prevent/handle |

---

## Dependencies

**Technical Dependencies:**
- Dependency 1: Why needed, alternatives
- Dependency 2: Why needed, alternatives

**Team Dependencies:**
- Needs design approval by [date]
- Needs review from [person] before Phase 2

**External Dependencies:**
- Waiting on library X release
- Blocked by API Y availability

---

## Progress Tracking

### Phase 1: [Status]
- Started: YYYY-MM-DD
- Completed: YYYY-MM-DD (or "In Progress")
- Blockers: [List any blockers]

### Phase 2: [Status]
[Same structure]

---

## Update Log

### YYYY-MM-DD
- Update description
- Reason for update

### YYYY-MM-DD
- Initial plan creation
```

---

## Style Guide Enhancements

### AI-First Writing Principles

#### 1. Token Efficiency

**Rule:** Optimize for information density

**Good:**
```markdown
## Installation

Install dependencies:
```bash
$ pnpm install
$ pnpm test
```
```

**Bad:**
```markdown
## Installation

First, you'll need to install all the project dependencies. This is done by running the pnpm install command. Once that's complete, you should verify everything works by running the test suite using pnpm test. This will ensure your environment is set up correctly.

To install dependencies, run:
```bash
$ pnpm install
```

After installation completes successfully, run the tests:
```bash
$ pnpm test
```
```

**Why:** Bad example uses 5x tokens for same information

#### 2. Progressive Disclosure Structure

**Template:**
```markdown
# Document Title

## Quick Reference (100-200 tokens)
Essential info, commands, concepts

## Detailed Guide (500-1000 tokens)
Step-by-step instructions, explanations

## Complete Reference (2000+ tokens)
Every option, edge cases, troubleshooting
```

#### 3. Context Priority Metadata

**Add to frontmatter:**
```yaml
ai:
  priority: high | medium | low | reference-only
  context_load: always | on-demand | never
  triggers: [keyword1, keyword2]
```

**Loading rules:**
- `priority: high` + `context_load: always` → Load for all tasks in this domain
- `priority: medium` + `context_load: on-demand` → Load when keywords match
- `priority: low` + `context_load: never` → Only load if directly referenced

#### 4. Trigger Keywords

**List keywords that should trigger doc loading:**
```yaml
triggers:
  - repository
  - database
  - prisma
  - orm
```

**AI behavior:**
- When user message contains these keywords, load this doc
- Use specific technical terms, not general words
- Include common misspellings/variants

#### 5. Atomic Documentation

**One concept per doc:**

**Good:**
```
concepts/integration-testing.md (300 tokens)
concepts/testcontainers.md (250 tokens)
concepts/test-fixtures.md (200 tokens)
```

**Bad:**
```
guides/testing-complete-guide.md (5000 tokens - loads all or nothing)
```

**Benefits:**
- AI loads exactly what's needed
- Reusable across multiple contexts
- Easier to maintain

#### 6. Anti-Patterns Section

**Every doc should include:**
```markdown
## ❌ Anti-Patterns

### Don't Mock Repositories in Integration Tests

**Why:** Tests pass with mocks but fail with real database.

**Wrong:**
```typescript
const mockRepo = { /* ... */ }
```

**Right:**
```typescript
const repo = new MemberRepository(testDb.prisma!)
```

**When you might think this is okay:** Unit testing business logic.

**Why it's still wrong:** Repository integration tests MUST use real database.
```

### Markdown Formatting Standards

#### Code Blocks

**Always specify language:**
```markdown
✅ Good:
```typescript
export function example() {}
```

❌ Bad:
```
export function example() {}
```
```

**Commands use bash with $ prompt:**
```markdown
✅ Good:
```bash
$ pnpm install
$ pnpm test
```

❌ Bad:
```bash
pnpm install
pnpm test
```
```

**Output uses plaintext or no language:**
```markdown
✅ Good:
```
✓ tests passed
```

❌ Bad:
```bash
✓ tests passed
```
```

#### File References

**Use markdown links for clickable paths:**
```markdown
✅ Good:
See [vitest.config.ts](apps/backend/vitest.config.ts) for configuration.

❌ Bad:
See `apps/backend/vitest.config.ts` for configuration.
```

#### Cross-References

**Always use relative paths:**
```markdown
✅ Good:
See [Testing Strategy](../reference/testing-strategy.md)

❌ Bad:
See [Testing Strategy](/docs/reference/testing-strategy.md)
```

#### Multi-File Changes

**Use tree structure:**
```markdown
packages/database/
├── src/
│   ├── client.ts          # Modified
│   └── repositories/
│       └── base.ts        # New
└── prisma/
    └── schema.prisma      # Modified
```

### Diátaxis Classification

#### Tutorial vs. How-To Decision Tree

```
Is the user learning something new?
├─ Yes → Tutorial
│   └─ Include: concepts, why, safe environment
└─ No → How-To
    └─ Include: steps only, minimal explanation
```

**Tutorial characteristics:**
- "Let me teach you"
- Walks through concepts
- Safe practice environment
- Beginner-friendly
- Example: "Learn Git by creating a project"

**How-To characteristics:**
- "Here's the answer"
- Lists steps only
- Assumes working system
- Practitioner-focused
- Example: "How to rebase a branch"

#### Reference vs. Explanation Decision Tree

```
Are you listing specifications?
├─ Yes → Reference
│   └─ Include: complete API, parameters, types
└─ No → Explanation
    └─ Include: concepts, rationale, alternatives
```

**Reference characteristics:**
- Complete specification
- "What it does"
- Organized by structure
- Tables, params, types
- Example: "API Endpoints Reference"

**Explanation characteristics:**
- Conceptual understanding
- "Why it works this way"
- Organized by understanding
- Narrative, diagrams, rationale
- Example: "API Design Principles"

### Document Lifecycle Rules

#### Staleness Detection

**Staleness calculation:**
```typescript
function calculateStaleness(doc: Document): string {
  const daysSinceReview = daysBetween(doc.reviewed, now())

  if (daysSinceReview < 30) return 'fresh'
  if (daysSinceReview < 90) return 'aging'
  return 'stale'
}
```

**Staleness thresholds:**
- **Fresh:** < 30 days since review
- **Aging:** 30-90 days since review
- **Stale:** > 90 days since review

**Update triggers:**
- Code changes behavior → Update docs
- New config options → Update reference
- Bug fix changes behavior → Update relevant docs
- User reports confusion → Add clarification

**Don't update for:**
- Internal refactor (no behavior change)
- Comment-only changes
- Test additions (unless changing guarantees)

#### Deprecation Process

**Steps:**
1. Add banner to deprecated doc:
   ```markdown
   > **⚠️ DEPRECATED:** This document is outdated. See [new doc](path/to/new.md) instead.
   ```
2. Update all cross-references to point to new doc
3. Update indices to mark as deprecated
4. After 6 months, move to `docs/archived/`
5. Update search config to exclude archived docs

#### Versioning Strategy

**For version-specific docs:**
```
docs/versioned/
├── v1/
│   └── feature-x-reference.md
└── v2/
    └── feature-x-reference.md
```

**Link current version from main docs:**
```markdown
# Feature X Reference

> **Version:** This doc covers v2. See [v1 docs](../versioned/v1/feature-x-reference.md) for legacy systems.
```

---

## Health Tracking System

### Health Metrics

**Per-Document Metrics:**
```typescript
interface DocHealth {
  path: string
  type: string                // Diátaxis type
  status: string              // draft | review | published | deprecated
  created: Date
  lastUpdated: Date
  lastReviewed: Date         // Human verification
  linkedFromCode: string[]   // Code files referencing this doc
  brokenLinks: number
  staleness: 'fresh' | 'aging' | 'stale'
  tokenCount: number
}
```

**Repository-Wide Metrics:**
```typescript
interface RepoHealth {
  totalDocs: number
  byType: Record<string, number>
  byStatus: Record<string, number>
  byStaleness: Record<string, number>
  avgTokenCount: number
  brokenLinkCount: number
  coveragePercent: number    // % of code with docs
}
```

### Health Script

**Location:** `.claude/scripts/doc-health.ts`

**Features:**
- Scan all docs in `docs/`
- Parse frontmatter
- Calculate staleness
- Check for broken links
- Count tokens (estimate)
- Generate health report
- Identify stale docs
- Suggest updates

**Usage:**
```bash
$ pnpm run docs:health
$ pnpm run docs:health --fix  # Auto-fix broken links
$ pnpm run docs:health --report health-report.json
```

**Output:**
```
Documentation Health Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Overview
  Total documents: 127
  Fresh: 98 (77%)
  Aging: 19 (15%)
  Stale: 10 (8%)

⚠️  Stale Documents (> 90 days)
  1. docs/guides/howto/deploy.md (142 days)
  2. docs/domains/authentication/reference.md (97 days)

🔗 Broken Links: 3
  1. docs/guides/tutorial/getting-started.md:42 → missing-file.md
  2. docs/reference/api.md:156 → old-endpoint.md

📈 Coverage
  Code files: 847
  Documented: 592 (70%)
  Missing docs: 255 (30%)

💡 Recommendations
  - Review 10 stale documents
  - Fix 3 broken links
  - Document 25 new repositories
```

### CI/CD Integration

**GitHub Actions workflow:**
```yaml
# .github/workflows/doc-health.yml
name: Documentation Health Check

on:
  push:
    branches: [main, develop]
  pull_request:
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday

jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Run health check
        run: pnpm run docs:health --report health-report.json

      - name: Check thresholds
        run: |
          # Fail if >10% stale
          # Fail if broken links exist
          # Fail if coverage < 60%
          pnpm run docs:health --enforce-thresholds

      - name: Upload report
        uses: actions/upload-artifact@v3
        with:
          name: doc-health-report
          path: health-report.json

      - name: Comment on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            // Post health summary as PR comment
```

### Link Checker

**Validate all internal links:**
```bash
$ pnpm run docs:check-links
```

**Features:**
- Check all markdown links
- Verify file paths exist
- Check anchor links (#section)
- Report broken links
- Suggest fixes

---

## Success Metrics

### Phase 1: Directory Structure
- [ ] All directories created (20+)
- [ ] CLAUDE.md in every directory (20+)
- [ ] Root README.md and CLAUDE.md exist
- [ ] Navigation is clear and intuitive

### Phase 2: Reorganization
- [ ] All existing docs moved to correct locations
- [ ] Lifecycle metadata added to temporal docs
- [ ] 5 index files created
- [ ] Extracted atomic concepts from existing docs

### Phase 3: Templates
- [ ] 9 complete templates created
- [ ] Template usage guide (CLAUDE.md)
- [ ] Validation checklist for each type

### Phase 4: Style Guide
- [ ] Complete style guide published
- [ ] AI-first principles documented
- [ ] Health tracking guide complete
- [ ] Diátaxis classification guide complete

### Overall Success Criteria
- [ ] Documentation is discoverable (< 30s to find any doc)
- [ ] AI can load relevant context efficiently
- [ ] Health monitoring is automated
- [ ] Templates make doc creation easy
- [ ] Lifecycle management is clear
- [ ] Zero broken links
- [ ] < 10% stale documents

---

## Migration Strategy

### Phase 1 Migration (Immediate)

**Week 1: Foundation**
1. Day 1-2: Create directory structure
2. Day 2-3: Write CLAUDE.md files
3. Day 3-4: Create root index and navigation
4. Day 4-5: Review and iterate

**No breaking changes** - Existing docs remain in place

### Phase 2 Migration (Week 2)

**Week 2: Reorganization**
1. Day 1: Move plans and add metadata
2. Day 2: Move session reports
3. Day 3: Create indices
4. Day 4: Extract atomic concepts
5. Day 5: Update all cross-references

**Breaking changes:**
- File paths change
- Update any hardcoded references
- Update CI/CD scripts if needed

### Phase 3 & 4 Migration (Week 2-3)

**Week 2-3: Templates and Guides**
1. Create templates (2 days)
2. Write style guides (2 days)
3. Set up health monitoring (1 day)
4. Document everything (1 day)

**No breaking changes** - Additive only

---

## Additional Frameworks Considered

### 1. C4 Model (Architecture Diagrams)

**Use for:** Architecture documentation in `docs/guides/explanation/`

**Levels:**
- Context: System boundaries
- Containers: Applications and services
- Components: Internal modules
- Code: Classes and functions

**When to use:** Explaining system architecture, bounded contexts

### 2. Arc42 (Architecture Documentation)

**Use for:** Complete architecture docs

**12 sections:**
1. Introduction and goals
2. Constraints
3. Context and scope
4. Solution strategy
5. Building blocks
6. Runtime view
7. Deployment view
8. Crosscutting concepts
9. Architecture decisions
10. Quality requirements
11. Risks and technical debt
12. Glossary

**When to use:** Large architectural overviews, system documentation

### 3. INVEST Principles (Plans & Requirements)

**Criteria for good plans:**
- **I**ndependent - Can be completed independently
- **N**egotiable - Details can be adjusted
- **V**aluable - Delivers value
- **E**stimable - Can estimate effort
- **S**mall - Completable in reasonable time
- **T**estable - Clear success criteria

**Use for:** Breaking down large plans, validating plan quality

### 4. Doc-Ops (Documentation Operations)

**Principles:**
- Treat docs as production systems
- Monitor uptime (availability)
- Alert on degradation (staleness)
- Measure SLOs (coverage, freshness)
- Automate maintenance

**Use for:** Long-term doc sustainability, team scalability

---

## Open Questions

1. **Health monitoring frequency:**
   - Run on every commit?
   - Weekly scheduled check?
   - Both?

2. **Deprecation timeline:**
   - 6 months before archiving?
   - Shorter for plans/research?

3. **Coverage targets:**
   - What % of code should have docs?
   - Different targets per layer (repos > services > utils)?

4. **Token budgets:**
   - Should we enforce max tokens per doc?
   - Different limits per type?

5. **Link checker in CI:**
   - Block merges on broken links?
   - Warning only?

---

## Timeline Summary

**Week 1:**
- Day 1-5: Phase 1 (Directory Structure + CLAUDE.md files)

**Week 2:**
- Day 1-3: Phase 2 (Reorganize Existing)
- Day 4-5: Phase 3 (Templates)

**Week 3:**
- Day 1-5: Phase 4 (Style Guides + Health Tracking)

**Total: 2-3 weeks**

---

## Next Steps

1. **Review this plan** - Verify approach and scope
2. **Spawn orchestrate-docs agent** - Execute all phases
3. **Initial health check** - Baseline metrics
4. **Iterate** - Refine based on usage
5. **Document learnings** - Session report after completion

---

## References

- [Diátaxis Framework](https://diataxis.fr/)
- [Zettelkasten Method](https://zettelkasten.de/)
- [C4 Model](https://c4model.com/)
- [Arc42](https://arc42.org/)
- [Backend Rebuild Plan](backend-rebuild-plan.md)
- [Testing Strategy Rule](../../.claude/rules/testing-strategy.md)
