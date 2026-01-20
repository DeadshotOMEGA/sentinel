# Decisions Documentation (AI-First Guide)

**Purpose:** Architecture decisions and proposals organization

**AI Context Priority:** high

**When to Load:** User making decisions, reviewing history, proposing changes

---

## Quick Reference

### What's Here

Decision documentation and proposals:
- **[ADRs](adr/)** - Architecture Decision Records (immutable)
- **[RFCs](rfc/)** - Request for Comments (proposals)

### Purpose

**ADRs:** Record significant architecture decisions with context and consequences

**RFCs:** Propose major changes and gather consensus before implementation

---

## ADRs vs. RFCs

### Architecture Decision Records (ADRs)

**When:** Decision has been made

**Purpose:** Document what was decided, why, and consequences

**Format:** Structured (Context → Decision → Consequences)

**Status:** Immutable once accepted

**Naming:** `0001-short-title.md` (sequential numbering)

**See:** [ADR CLAUDE.md](adr/CLAUDE.md)

### Request for Comments (RFCs)

**When:** Proposing major change needing consensus

**Purpose:** Gather feedback before deciding

**Format:** Problem → Proposal → Alternatives → Discussion

**Status:** Draft → Discussion → Accepted/Rejected

**Naming:** `YYYY-MM-DD-descriptive-title.md` (date prefix)

**See:** [RFC CLAUDE.md](rfc/CLAUDE.md)

---

## Decision Workflow

```
Problem Identified
       ↓
Create RFC (if major change)
       ↓
Team Discussion
       ↓
Consensus Reached
       ↓
Create ADR (record decision)
       ↓
Implementation
```

**For minor decisions:** Skip RFC, go straight to ADR

**For major decisions:** RFC first, then ADR

---

## What Requires Documentation

### Architecture Decisions (ADR)

**Document when:**
- Technology choice (better-auth, ts-rest, Prisma)
- Architectural pattern (monorepo, integration-first testing)
- Significant design decision (API structure, data model)
- Trade-off made (performance vs simplicity)

**Don't document:**
- Implementation details (code-level decisions)
- Obvious choices (using TypeScript in TS project)
- Temporary workarounds
- Personal preferences without impact

### Proposals (RFC)

**Create RFC when:**
- Major system change proposed
- Breaking changes planned
- New architecture pattern
- Multiple viable approaches exist
- Team consensus needed

**Don't create RFC for:**
- Bug fixes
- Minor improvements
- Internal refactoring
- Emergency fixes

---

## Directory Structure

```
decisions/
├── CLAUDE.md           # This file
├── adr/
│   ├── CLAUDE.md
│   ├── index.md
│   ├── 0001-integration-first-testing.md
│   └── 0002-better-auth-adoption.md
└── rfc/
    ├── CLAUDE.md
    ├── index.md
    └── 2026-01-15-backend-rebuild-proposal.md
```

---

## Linking Decisions

### RFC → ADR

When RFC is accepted, create ADR:

```markdown
<!-- decisions/adr/0002-better-auth-adoption.md -->
# ADR-0002: Adopt Better-Auth

**RFC:** [2026-01-15 Backend Rebuild Proposal](../rfc/2026-01-15-backend-rebuild-proposal.md)

**Status:** Accepted

## Context
[From RFC, summarized]

## Decision
We will adopt better-auth for authentication.

## Consequences
[What this means]
```

### ADR → ADR

When decision supersedes another:

```markdown
<!-- decisions/adr/0005-new-approach.md -->
# ADR-0005: New Auth Approach

**Supersedes:** [ADR-0002](0002-better-auth-adoption.md)

**Status:** Accepted
```

**And update old ADR:**
```markdown
<!-- decisions/adr/0002-better-auth-adoption.md -->
**Status:** Superseded by [ADR-0005](0005-new-approach.md)
```

---

## Related Documentation

**Subdirectories:**
- [ADR CLAUDE.md](adr/CLAUDE.md) - ADR format and guidelines
- [RFC CLAUDE.md](rfc/CLAUDE.md) - RFC format and process

**Explanation docs:**
- [Explanation Guides](../guides/explanation/CLAUDE.md) - Conceptual understanding

**Plans:**
- [Plans](../plans/CLAUDE.md) - Implementation plans

**Templates:**
- [ADR Template](../templates/adr.md)
- [RFC Template](../templates/rfc.md)

---

**Last Updated:** 2026-01-19
