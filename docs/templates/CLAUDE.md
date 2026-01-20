# Document Templates (AI-First Guide)

**Purpose:** Template usage guide for creating new documentation

**AI Context Priority:** high

**When to Load:** User creating new documentation, asking about templates

---

## Quick Reference

### What's Here

9 document templates ready to copy:
- `tutorial.md` - Learning-oriented guides
- `howto.md` - Task-oriented solutions
- `reference.md` - Complete specifications
- `explanation.md` - Conceptual understanding
- `adr.md` - Architecture Decision Records
- `rfc.md` - Request for Comments
- `plan.md` - Implementation plans
- `research.md` - Investigation documents
- `session-report.md` - Session summaries

### When to Use

**Creating any new documentation** → Start with appropriate template

**Template provides:**
- Complete frontmatter with all fields
- Section structure
- Writing guidance
- Examples
- AI-first metadata

---

## Template Selection Guide

### By Document Type

**Teaching someone new:**
```bash
cp docs/templates/tutorial.md docs/guides/tutorials/your-topic.md
```

**Solving specific task:**
```bash
cp docs/templates/howto.md docs/guides/howto/your-task.md
```

**Documenting specifications:**
```bash
cp docs/templates/reference.md docs/guides/reference/your-api.md
```

**Explaining concepts:**
```bash
cp docs/templates/explanation.md docs/guides/explanation/your-concept.md
```

**Recording architecture decision:**
```bash
cp docs/templates/adr.md docs/decisions/adr/0001-your-decision.md
# Note: Use next sequential number (0001, 0002, etc.)
```

**Proposing major change:**
```bash
cp docs/templates/rfc.md docs/decisions/rfc/2026-01-20-your-proposal.md
# Note: Use today's date
```

**Planning implementation:**
```bash
cp docs/templates/plan.md docs/plans/active/2026-01-20-your-plan.md
# Note: Use today's date
```

**Documenting research:**
```bash
cp docs/templates/research.md docs/research/2026-01-20-your-research.md
# Note: Use today's date
```

**Recording session:**
```bash
cp docs/templates/session-report.md docs/sessions/2026-01-20-your-session.md
# Note: Use today's date
```

---

## Template Structure

### All Templates Include

**1. Frontmatter (required)**
```yaml
---
type: [document type]
title: "Document Title"
status: draft | review | published | deprecated
created: YYYY-MM-DD
last_updated: YYYY-MM-DD
---
```

**2. AI Metadata (recommended)**
```yaml
ai:
  priority: high | medium | low
  context_load: always | on-demand | never
  triggers: [keyword1, keyword2]
  token_budget: 500
```

**3. Section Structure**
- Pre-defined headings for consistency
- Instructions in each section
- Examples where helpful

**4. Writing Guidance**
- What to include
- What to avoid
- Tone and style notes

---

## Using Templates

### Step-by-Step

**1. Copy template to destination**
```bash
cp docs/templates/[type].md docs/[section]/[filename].md
```

**2. Update frontmatter**
- Change `title` to your document title
- Set `status` to `draft`
- Add today's date to `created` and `last_updated`
- Customize AI metadata (triggers, priority)

**3. Follow section structure**
- Keep headings as-is (or adjust if needed)
- Replace placeholder text with content
- Delete sections marked "optional" if not needed

**4. Add cross-references**
- Link to related documents
- Update relevant index files
- Link from related docs back to this one

**5. Validate**
- Check frontmatter is complete
- Verify file naming follows conventions
- Run doc-validator (when available)

---

## Frontmatter Guide

### Required Fields

```yaml
---
type: tutorial           # Must match template type
title: "Your Title"      # Descriptive, matches filename
status: draft            # Start with draft
created: 2026-01-20      # Today's date
last_updated: 2026-01-20 # Same as created initially
---
```

### AI Metadata Fields

**priority:**
- `high` - Load for all tasks in this domain
- `medium` - Load when triggers match
- `low` - Load only when directly referenced
- `reference-only` - Never auto-load

**context_load:**
- `always` - Load with priority: high
- `on-demand` - Load when user asks or triggers match
- `never` - Only load if explicitly requested

**triggers:**
- Keywords that should trigger loading
- Use specific technical terms
- Example: `[repository, database, prisma]`

**token_budget:**
- Estimated tokens for this document
- Helps AI manage context budget
- Example: `500` for quick reference, `2000` for complete guide

### Temporal Document Fields

For plans, research, sessions:

```yaml
---
# ... standard frontmatter ...
lifecycle: active              # active | completed | archived | superseded
reviewed: 2026-01-20           # Last review date
expires: 2026-03-01            # When to review for staleness
superseded_by: path/to/new.md  # If replaced
related_code:
  - apps/backend/src/
  - packages/database/
---
```

---

## Template Customization

### When to Modify Structure

**✅ Good reasons:**
- Domain-specific sections needed
- Template doesn't fit your use case
- Adding valuable examples

**❌ Bad reasons:**
- Removing required frontmatter
- Changing established conventions
- Making it "simpler" by removing guidance

### How to Customize

**1. Keep frontmatter intact**
- All required fields must stay
- AI metadata is recommended

**2. Adjust sections as needed**
- Add domain-specific headings
- Remove optional sections
- Combine related sections

**3. Maintain Diátaxis classification**
- Don't mix tutorial + reference in one doc
- Split if content spans types

**4. Follow naming conventions**
- See [File Naming Guide](../CLAUDE.md#file-naming-conventions)
- Match filename to title

---

## Examples

### Good Template Usage

**✅ Minimal customization:**
```yaml
---
type: howto
title: "How to Add a Repository"
status: draft
created: 2026-01-20
last_updated: 2026-01-20
ai:
  priority: high
  context_load: on-demand
  triggers: [repository, database, prisma, create]
  token_budget: 800
---

# How to Add a Repository

[Follows template structure exactly, fills in content]
```

**✅ Domain-specific addition:**
```yaml
---
type: reference
title: "Authentication API Reference"
status: published
created: 2026-01-20
last_updated: 2026-01-20
ai:
  priority: high
  context_load: always
  triggers: [auth, authentication, login, session]
  token_budget: 1500
---

# Authentication API Reference

## Quick Reference
[Standard section]

## API Endpoints
[Standard section]

## Security Considerations
[Added domain-specific section]

## Examples
[Standard section]
```

### Anti-Patterns

**❌ Missing frontmatter:**
```markdown
# My Document

Content without metadata...
```

**Fix:** Always use template with complete frontmatter

**❌ Wrong template type:**
```yaml
---
type: tutorial
title: "API Reference"  # This is reference, not tutorial!
---
```

**Fix:** Use `reference.md` template for reference docs

**❌ Mixed Diátaxis types:**
```markdown
---
type: tutorial
---

# Authentication Tutorial

This tutorial teaches authentication...
[tutorial content]

## API Reference
[reference tables]

## Why Better-Auth
[explanation content]
```

**Fix:** Split into 3 documents:
- `tutorial-authentication.md`
- `reference-auth-api.md`
- `explanation-auth-architecture.md`

---

## Template-Specific Guidance

### Tutorial Template

**Use when:** Teaching new concepts through practice

**Key sections:**
- Prerequisites (what user needs first)
- Step-by-step instructions
- Expected output at each step
- Troubleshooting common issues

**Tone:** Patient, explanatory, beginner-friendly

**Example:** "Learn testing by writing your first integration test"

### How-to Template

**Use when:** Solving specific practical problem

**Key sections:**
- Goal statement (one sentence)
- Assumptions (what user already has)
- Steps (minimal explanation)
- Verification (how to confirm it worked)

**Tone:** Direct, concise, expert-to-expert

**Example:** "How to add a new repository to the database package"

### Reference Template

**Use when:** Documenting complete specifications

**Key sections:**
- Overview
- API/Configuration details (tables)
- Parameters, types, return values
- Examples for each item
- Error conditions

**Tone:** Precise, complete, factual

**Example:** "API Endpoints Reference"

### Explanation Template

**Use when:** Explaining concepts and rationale

**Key sections:**
- Context (why this matters)
- The concept/pattern (how it works)
- Rationale (why this approach)
- Trade-offs (pros and cons)
- Alternatives considered

**Tone:** Thoughtful, analytical, balanced

**Example:** "Why Integration-First Testing"

### ADR Template

**Use when:** Recording architecture decision

**Key sections:**
- Context (situation that led to decision)
- Decision (what was decided)
- Options considered
- Consequences (positive and negative)
- Status (proposed, accepted, deprecated, superseded)

**Numbering:** Sequential starting from 0001

**Example:** "0001-integration-first-testing.md"

### RFC Template

**Use when:** Proposing major change needing consensus

**Key sections:**
- Problem (what needs solving)
- Goals / Non-goals
- Proposal (detailed solution)
- Alternatives considered
- Risks / Mitigations
- Rollout plan

**Naming:** Date prefix for chronological sorting

**Example:** "2026-01-20-backend-rebuild-proposal.md"

### Plan Template

**Use when:** Planning implementation work

**Key sections:**
- Executive summary
- Current state / Problems
- Goals / Non-goals
- Implementation phases
- Success metrics
- Timeline
- Risks

**Lifecycle:** Start as `active`, move to `completed` when done

**Example:** "2026-01-20-phase-2-infrastructure.md"

### Research Template

**Use when:** Documenting investigation

**Key sections:**
- Hypothesis / Question
- Methodology
- Findings
- Analysis
- Recommendation
- References

**Lifecycle:** `active` during research, `completed` when finished

**Example:** "2026-01-20-orm-performance-comparison.md"

### Session Report Template

**Use when:** Recording significant work session

**Key sections:**
- Session info (date, participants, duration)
- Objectives
- Work completed
- Decisions made
- Blockers encountered
- Next steps

**Naming:** Always date-prefixed

**Example:** "2026-01-20-repository-migration.md"

---

## Validation Checklist

Before considering document complete:

- [ ] Frontmatter is complete and accurate
- [ ] File named according to conventions
- [ ] Content follows template structure
- [ ] Examples are tested and working
- [ ] Cross-references added
- [ ] Related docs link back to this
- [ ] Index files updated
- [ ] No broken links (run link checker)
- [ ] Spelling and grammar checked
- [ ] Code examples use correct language tags

---

## Related Documentation

**File naming conventions:**
- [Root CLAUDE.md](../CLAUDE.md#file-naming-conventions)
- [Complete Plan](../plans/active/ai-first-documentation-system.md#file-naming-conventions)

**Style guides:**
- [Style Guide](../meta/style-guide.md) (coming soon)
- [AI-First Principles](../meta/ai-first-principles.md) (coming soon)
- [Diátaxis Guide](../meta/diataxis-guide.md) (coming soon)

**Creating documentation:**
- [Root CLAUDE.md - Creating Docs](../CLAUDE.md#creating-new-documentation)

---

## Template Files

All 9 templates ready to use:

1. [tutorial.md](tutorial.md) - Tutorial template
2. [howto.md](howto.md) - How-to template
3. [reference.md](reference.md) - Reference template
4. [explanation.md](explanation.md) - Explanation template
5. [adr.md](adr.md) - ADR template
6. [rfc.md](rfc.md) - RFC template
7. [plan.md](plan.md) - Plan template
8. [research.md](research.md) - Research template
9. [session-report.md](session-report.md) - Session report template

---

**Last Updated:** 2026-01-19
