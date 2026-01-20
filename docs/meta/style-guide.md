---
type: meta
title: "Documentation Style Guide"
status: published
created: 2026-01-19
last_updated: 2026-01-19
ai:
  priority: high
  context_load: on-demand
  triggers:
    - style
    - writing
    - conventions
    - standards
    - formatting
  token_budget: 2000
---

# Documentation Style Guide

**Purpose:** Complete writing conventions for Sentinel documentation

**Audience:** Documentation writers (human and AI)

**Scope:** All documentation in `docs/`

---

## Layer 1: Quick Reference (Essential Standards)

### Core Principles

1. **AI-First:** Optimize for machine readability, maintain human usability
2. **Progressive Disclosure:** Layer information (quick → detailed → complete)
3. **Atomic Docs:** One concept per document, densely linked
4. **Lifecycle Management:** Track creation, review, staleness

### File Naming

```
Tutorial:       tutorial-[topic].md OR [topic].md
How-to:         howto-[task].md
Reference:      reference-[subject].md OR [subject]-api.md
Explanation:    explanation-[concept].md
ADR:            NNNN-short-title.md (0001, 0002, etc.)
RFC:            YYYY-MM-DD-title.md
Plan:           YYYY-MM-DD-plan-name.md
Research:       YYYY-MM-DD-investigation.md
Session:        YYYY-MM-DD-session-topic.md
```

### Required Frontmatter

```yaml
---
type: [tutorial|howto|reference|explanation|adr|rfc|plan|research|session]
title: "Document Title"
status: [draft|published|deprecated]
created: YYYY-MM-DD
last_updated: YYYY-MM-DD
ai:
  priority: [high|medium|low]
  context_load: [always|on-demand|never]
  triggers: [keywords, for, matching]
  token_budget: [number]
---
```

### Markdown Basics

- Headings: `##` for main sections (never single `#` except title)
- Code: Use fenced blocks with language: ` ```typescript `
- Links: Relative paths from current file
- Lists: `-` for unordered, `1.` for ordered
- Emphasis: `**bold**` for important, `*italic*` for terms

---

## Layer 2: Detailed Standards

### Document Classification (Diátaxis)

**See:** [diataxis-guide.md](diataxis-guide.md) for complete classification guide

**Quick decision tree:**

```
Need to...
├─ Learn concept? → Tutorial (learning-oriented)
├─ Solve problem? → How-to (task-oriented)
├─ Look up spec? → Reference (information-oriented)
└─ Understand why? → Explanation (understanding-oriented)
```

**Classification markers in frontmatter:**

```yaml
type: tutorial  # Learning-oriented
type: howto     # Task-oriented
type: reference # Information-oriented
type: explanation # Understanding-oriented
```

### File Naming Conventions

**General rules:**
- Always kebab-case: `authentication-architecture.md`
- No underscores: ~~`authentication_architecture.md`~~
- No spaces: ~~`authentication architecture.md`~~
- Lowercase only: ~~`Authentication-Architecture.md`~~

---

#### Diátaxis Documents

**Tutorial:**
```
# Good
tutorial-getting-started.md
tutorial-first-checkin.md
getting-started.md (if directory is tutorials/)

# Bad
tutorial_getting_started.md
Tutorial-Getting-Started.md
getting started.md
```

**How-to:**
```
# Good
howto-setup-testcontainers.md
howto-create-api-key.md
setup-testcontainers.md (if directory is howto/)

# Bad
how-to-setup-testcontainers.md (no hyphen in "howto")
setup_testcontainers.md
```

**Reference:**
```
# Good
reference-auth-api.md
reference-member-schema.md
auth-api.md (if directory is reference/)

# Bad
auth-api-reference.md (redundant if in reference/ dir)
authAPI.md (not kebab-case)
```

**Explanation:**
```
# Good
explanation-direction-detection.md
explanation-session-management.md
direction-detection.md (if directory is explanation/)

# Bad
direction-detection-explained.md (redundant)
```

---

#### Temporal Documents

**ADR (Architecture Decision Records):**
```
# Pattern
NNNN-short-title.md

# Good
0001-integration-first-testing.md
0002-better-auth-adoption.md
0042-deprecate-custom-jwt.md

# Bad
1-testing.md (not zero-padded)
adr-0001-testing.md (redundant prefix)
2024-01-19-testing.md (ADRs use sequential, not dates)
```

**Why sequential:** ADRs are ordered by decision order, not chronology

**RFC (Request for Comments):**
```
# Pattern
YYYY-MM-DD-title.md

# Good
2026-01-20-adopt-testcontainers.md
2026-02-15-migrate-to-monorepo.md

# Bad
rfc-testcontainers.md (missing date)
01-20-2026-testcontainers.md (wrong date format)
20260120-testcontainers.md (no dashes)
```

**Why dates:** RFCs are proposals with temporal context

**Plans:**
```
# Pattern (time-boxed plans)
YYYY-MM-DD-plan-name.md

# Pattern (living documents)
descriptive-name-plan.md

# Good
2026-01-19-ai-first-documentation-system.md (time-boxed)
backend-rebuild-plan.md (living document)

# Bad
plan-2026-01-19.md (date should be prefix)
documentation_system.md (not kebab-case)
```

**Research:**
```
# Pattern
YYYY-MM-DD-investigation-topic.md

# Good
2026-01-20-testcontainers-evaluation.md
2026-02-01-better-auth-comparison.md

# Bad
testcontainers-research.md (missing date)
research-testcontainers-2026-01-20.md (date should be prefix)
```

**Session Reports:**
```
# Pattern
YYYY-MM-DD-session-topic.md

# Good
2026-01-19-repository-migration.md
2026-01-20-testing-setup.md

# Bad
session-2026-01-19.md (date should be prefix)
2026-01-19.md (needs topic)
```

---

### Frontmatter Standards

**Required fields (all documents):**

```yaml
---
type: [document type]
title: "Human-Readable Title"
status: [draft|published|deprecated]
created: YYYY-MM-DD
last_updated: YYYY-MM-DD
ai:
  priority: [high|medium|low]
  context_load: [always|on-demand|never]
  triggers: [keyword1, keyword2, keyword3]
  token_budget: [number]
---
```

**Additional fields by type:**

**Tutorial/How-to:**
```yaml
difficulty: [easy|medium|hard]
estimated_time: "30 minutes"
prerequisites:
  - [What learner needs to know]
```

**Reference:**
```yaml
version: "1.0.0"
stability: [stable|beta|alpha|deprecated]
api_version: "v1"
```

**ADR:**
```yaml
status: [proposed|accepted|deprecated|rejected|superseded]
decided: YYYY-MM-DD
decision_makers: [Names]
supersedes: [NNNN-old-adr.md]
superseded_by: [NNNN-new-adr.md]
```

**RFC:**
```yaml
status: [draft|open|under-review|accepted|rejected|withdrawn]
author: [Name]
comment_deadline: YYYY-MM-DD
resulting_adr: [Link if accepted]
```

**Plan:**
```yaml
lifecycle: [draft|active|completed|archived|superseded]
reviewed: YYYY-MM-DD
expires: YYYY-MM-DD
related_code:
  - [paths to affected code]
superseded_by: [Link if superseded]
```

**Research:**
```yaml
researcher: [Name]
research_type: [spike|comparison|performance|feasibility|security]
completed: YYYY-MM-DD
resulting_decision: [Link to ADR]
```

**Session:**
```yaml
date: YYYY-MM-DD
duration: [X hours]
phase: [Project phase]
domains: [Domains worked on]
related_plan: [Link to active plan]
```

---

### AI Metadata Guidelines

**Priority:**
- `high` - Core functionality, frequently accessed (auth, testing, repositories)
- `medium` - Important but occasional (tutorials, explanations)
- `low` - Reference, rarely accessed directly

**Context Load:**
- `always` - Load with any related work (active plans, core ADRs)
- `on-demand` - Load when explicitly relevant (most docs)
- `never` - Historical only, never auto-load (archived plans)

**Triggers:**
Keywords that should load this doc. Include:
- Technical terms (authentication, testing, prisma)
- Domain names (personnel, checkin, events)
- File/path keywords (repositories, services, routes)
- Concept names (integration-testing, better-auth)

**Token Budget:**
Estimated tokens for full document:
- Quick reference: 500-800
- How-to guide: 800-1200
- Tutorial: 1200-1800
- Explanation: 1500-2000
- Reference: 1500-2500
- ADR: 1000-1500
- Plan: 2000-3000

---

### Markdown Formatting

#### Headings

**Rules:**
- Document title: Single `#` (only in title, not in body)
- Main sections: `##`
- Subsections: `###`
- Sub-subsections: `####`
- Never use `#####` or deeper (restructure document)

**Example:**
```markdown
# Document Title (only here)

## Main Section

### Subsection

#### Detail Level

Content here.
```

**Numbering:** Don't number headings manually. Markdown renders structure.

```markdown
❌ Bad
## 1. Introduction
## 2. Installation

✅ Good
## Introduction
## Installation
```

---

#### Code Blocks

**Always specify language:**

` ```typescript ` (not ` ``` ` alone)

**Supported languages:**
- `typescript` / `javascript` / `jsx` / `tsx`
- `bash` / `sh`
- `yaml` / `json`
- `sql`
- `markdown`
- `text` (for plain output)

**Inline code:**
- Command names: `` `pnpm test` ``
- File paths: `` `src/repositories/member-repository.ts` ``
- Variables: `` `userId` ``
- Short code: `` `const result = await api.call()` ``

**Comments in code blocks:**

```typescript
// ✅ Good: Explain non-obvious code
const hash = await bcrypt.hash(password, 12) // 12 rounds for security

// ❌ Bad: State the obvious
const user = await prisma.user.findUnique() // Find user
```

---

#### Links

**Internal links (relative paths):**

```markdown
See [Auth API Reference](../reference/auth-api.md)
```

**Cross-domain links:**

```markdown
See [Personnel Domain](../../domains/personnel/CLAUDE.md)
```

**Section links (within document):**

```markdown
See [Installation](#installation)
```

**External links:**

```markdown
See [Diátaxis Framework](https://diataxis.fr/)
```

**Code file links (clickable in VSCode):**

```markdown
See: [apps/backend/src/repositories/member-repository.ts](../../../apps/backend/src/repositories/member-repository.ts)
```

**Code with line numbers:**

```markdown
See: [member-repository.ts:42](../../../apps/backend/src/repositories/member-repository.ts#L42)
```

---

#### Lists

**Unordered lists:**

```markdown
- Item 1
- Item 2
  - Nested item
  - Another nested
- Item 3
```

**Ordered lists:**

```markdown
1. First step
2. Second step
3. Third step
```

**Auto-numbered (both render the same):**

```markdown
1. First
1. Second (renders as 2)
1. Third (renders as 3)
```

**Task lists:**

```markdown
- [ ] Incomplete task
- [x] Completed task
- [ ] Another task
```

**Multi-paragraph list items:**

```markdown
1. First item

   Explanation paragraph for first item.

   ```typescript
   // Code example
   ```

2. Second item
```

---

#### Tables

**Standard table:**

```markdown
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Value 1  | Value 2  | Value 3  |
| Value 4  | Value 5  | Value 6  |
```

**Alignment:**

```markdown
| Left | Center | Right |
|:-----|:------:|------:|
| L    | C      | R     |
```

**Complex cells:**

```markdown
| Feature | Status | Notes |
|---------|--------|-------|
| Auth | ✅ Complete | Using better-auth |
| Testing | 🔄 In Progress | 80% coverage |
| Docs | ⏳ Planned | Phase 4 |
```

---

#### Emphasis

**Bold (`**text**`):**
- Important terms
- Warnings/cautions
- Key points

**Italic (`*text*`):**
- Technical terms on first use
- Emphasis within sentence

**Code (`` `text` ``):**
- Commands
- File paths
- Variable names
- Code snippets

**Examples:**

```markdown
The **primary goal** is to implement *integration-first* testing using `testcontainers`.

**Warning:** Never commit `.env` files to git.

Use `pnpm test` to run the test suite.
```

---

#### Blockquotes

**Use for:**
- Callouts
- Important notes
- Quotes from external sources

**Format:**

```markdown
> **Note:** This is important information.

> **Warning:** Don't do this dangerous thing.

> **Tip:** Here's a helpful suggestion.
```

---

#### Horizontal Rules

**Use to separate major sections:**

```markdown
## Section 1

Content here.

---

## Section 2

Content here.
```

**When to use:**
- Between major document sections
- Before "Related Documentation" section
- After executive summary

**When not to use:**
- Between every heading
- Within list items
- In the middle of explanations

---

### Cross-Referencing

**Always link related docs:**

```markdown
## Related Documentation

**How-to Guides:**
- [How to Create API Key](../../guides/howto/create-api-key.md)

**Reference:**
- [Auth API Reference](../../guides/reference/auth-api.md)

**Explanation:**
- [Authentication Architecture](../../guides/explanation/auth-architecture.md)

**Decisions:**
- [ADR-0002: better-auth Adoption](../../decisions/adr/0002-better-auth-adoption.md)
```

**Bidirectional links:**

When referencing Doc A from Doc B, also reference Doc B from Doc A.

**Example:**

In `auth-api.md`:
```markdown
See [Authentication Architecture](../explanation/auth-architecture.md) for design rationale.
```

In `auth-architecture.md`:
```markdown
See [Auth API Reference](../reference/auth-api.md) for endpoint specifications.
```

---

## Layer 3: Complete Standards

### Review Process

**Before publishing:**

1. **Self-review checklist:**
   - [ ] Type classification correct?
   - [ ] All required frontmatter present?
   - [ ] Triggers appropriate for content?
   - [ ] Token budget realistic?
   - [ ] Code examples tested?
   - [ ] Links functional?
   - [ ] Grammar/spelling checked?
   - [ ] AI-first optimized?

2. **Validation:**
   ```bash
   # Check markdown lint
   markdownlint docs/**/*.md

   # Check links (if link-checker installed)
   markdown-link-check docs/**/*.md
   ```

3. **Status update:**
   - Change `status: draft` to `status: published`
   - Update `last_updated` date
   - Add to appropriate index file

---

### Versioning & Deprecation

**When to deprecate:**
- Content no longer accurate
- Better document supersedes it
- Feature/API removed

**How to deprecate:**

1. **Update frontmatter:**
   ```yaml
   status: deprecated
   deprecated_date: YYYY-MM-DD
   superseded_by: [Link to new doc]
   ```

2. **Add deprecation notice at top:**
   ```markdown
   > **⚠️ DEPRECATED:** This document is deprecated as of YYYY-MM-DD.
   >
   > See [New Document](link-to-new.md) for current information.
   ```

3. **Don't delete:** Keep for historical context

4. **Update links:** Change other docs to link to new version

---

### Breaking Changes

**When API/process changes significantly:**

1. **Document breaking change:**
   ```markdown
   ## Breaking Changes

   ### Version X.Y.Z (YYYY-MM-DD)

   **Changed:** [What changed]

   **Migration:**
   ```[language]
   // Old way
   oldFunction()

   // New way
   newFunction()
   ```

   **See:** [Migration Guide](link)
   ```

2. **Create migration guide** if complex

3. **Update all examples** to new approach

4. **Mark old approach** as deprecated

---

### Special Document Types

#### CLAUDE.md Files

**Purpose:** AI-first navigation and usage guides

**Location:** Every directory with documents

**Structure:**

```markdown
# [Directory Name] (AI-First Guide)

**Purpose:** [One sentence]

**AI Context Priority:** [high|medium|low]

**When to Load:** [Conditions]

**Triggers:** [keywords]

---

## Quick Reference

[Layer 1: Essential info in 100-200 tokens]

---

## [Layer 2 Sections]

[Detailed guidance in 500-1000 tokens]

---

## [Layer 3 Sections]

[Complete reference if needed]

---

**Last Updated:** YYYY-MM-DD
```

**Requirements:**
- Progressive disclosure (3 layers)
- When to create docs here
- File naming conventions for directory
- Examples of good docs
- Anti-patterns
- Related documentation links

---

#### Index Files

**Purpose:** Central registry for temporal docs

**Locations:**
- `docs/plans/index.md`
- `docs/sessions/index.md`
- `docs/research/index.md`
- `docs/decisions/adr/index.md`
- `docs/decisions/rfc/index.md`

**Required sections:**
- Active/Open items
- Completed items
- Archived items (if applicable)
- Statistics
- How to create new docs
- Search commands

**Update when:**
- New doc created
- Status changes
- Doc moved to completed/archived

---

### Anti-Patterns

**❌ Don't:**

1. **Mix document types:**
   ```markdown
   # How to Set Up Testing (Tutorial)

   This explains the testing philosophy... [Should be separate explanation]

   Step 1: Install packages... [This is the how-to part]
   ```

   **Fix:** Split into `explanation-testing-philosophy.md` and `howto-setup-testing.md`

2. **Orphan documents:**
   ```markdown
   # Some Cool Feature

   [No links from anywhere, no links to anywhere]
   ```

   **Fix:** Add to index, link from related docs, add "Related Documentation" section

3. **Stale examples:**
   ```markdown
   # Authentication with Old JWT

   [Code showing deprecated approach from 6 months ago]
   ```

   **Fix:** Update to current approach OR mark as deprecated with migration path

4. **Missing prerequisites:**
   ```markdown
   # Advanced Testing Patterns

   [Assumes knowledge never documented]
   ```

   **Fix:** Add prerequisites section with links to foundational docs

5. **Unclear classification:**
   ```markdown
   ---
   type: reference
   ---

   # Understanding Authentication

   [Actually an explanation, not a reference spec]
   ```

   **Fix:** Change type to `explanation` and restructure if needed

6. **Broken links:**
   ```markdown
   See [Auth Guide](../auth/guide.md) [file doesn't exist]
   ```

   **Fix:** Fix path or create missing doc

7. **Missing AI metadata:**
   ```yaml
   ---
   type: howto
   title: "Setup Guide"
   # No ai: section
   ---
   ```

   **Fix:** Add complete AI metadata

---

### Migration from Legacy Docs

**If legacy doc exists:**

1. **Assess type:** Tutorial, how-to, reference, or explanation?

2. **Split if needed:** Mixed types should become separate docs

3. **Rename to convention:** Apply proper file naming

4. **Add frontmatter:** Complete with AI metadata

5. **Restructure:** Match template for document type

6. **Update links:** Fix all references to old location

7. **Add to index:** Register in appropriate index file

8. **Mark old as redirect** (if keeping):
   ```markdown
   # Old Document

   > **Moved:** This content has moved to [new location](link).
   ```

---

## Related Documentation

**Meta documentation:**
- [AI-First Principles](ai-first-principles.md) - AI optimization strategies
- [Health Tracking](health-tracking.md) - Monitoring documentation health
- [Diátaxis Guide](diataxis-guide.md) - Complete classification guide

**Templates:**
- [Template Usage](../templates/CLAUDE.md) - How to use templates
- [All Templates](../templates/) - Starting points for new docs

**Root guides:**
- [Documentation System](../CLAUDE.md) - System overview
- [README](../README.md) - Human navigation

---

**Last Updated:** 2026-01-19
