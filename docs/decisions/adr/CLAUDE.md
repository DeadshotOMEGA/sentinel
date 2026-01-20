# Architecture Decision Records (AI-First Guide)

**Purpose:** ADR format and management guide

**AI Context Priority:** high

**When to Load:** User creating ADRs, recording decisions, reviewing history

**Triggers:** adr, architecture decision, decision record

---

## Quick Reference

### What Are ADRs?

Immutable records of significant architecture decisions including:
- What was decided
- Why it was decided
- What alternatives were considered
- What consequences (positive and negative)

### File Naming

**Pattern:** `NNNN-short-title.md`

**Examples:**
- `0001-integration-first-testing.md`
- `0002-better-auth-adoption.md`
- `0003-ts-rest-contracts.md`

**Numbering:** Sequential, zero-padded 4 digits (0001, 0002, ...)

---

## When to Create ADRs

**Create ADR when:**
- Choosing technology (libraries, frameworks, tools)
- Adopting architectural pattern
- Making design decision with long-term impact
- Trade-off affects multiple systems
- Future team needs context for decision

**Examples:**
- "Why we use integration-first testing"
- "Why we chose better-auth"
- "Why monorepo structure"

**Don't create ADR for:**
- Implementation details (which variable name)
- Temporary decisions (quick fix)
- Obvious choices (using TS in TS project)
- Reversible decisions with no impact

---

## ADR Structure

### Required Sections

```markdown
# ADR-NNNN: Title

**Status:** Proposed | Accepted | Deprecated | Superseded

**Date:** YYYY-MM-DD

**Context:**
What is the issue we're seeing that is motivating this decision?

**Decision:**
What is the change we're proposing/making?

**Options Considered:**
1. Option A - Why/why not
2. Option B - Why/why not
3. Option C (chosen) - Why

**Consequences:**

Positive:
- Benefit 1
- Benefit 2

Negative:
- Drawback 1
- Drawback 2

**Related:**
- Links to RFCs, plans, other ADRs
```

---

## ADR Status

### Proposed
- Decision being considered
- Not yet implemented
- Open for discussion

### Accepted
- Decision approved
- Implementation in progress or complete
- Immutable (don't edit, create new ADR if changing)

### Deprecated
- No longer recommended
- Better approach found
- Link to superseding ADR

### Superseded
- Replaced by newer ADR
- Link to new ADR
- Keep for historical record

---

## Writing Good ADRs

### Do

✅ **Provide context**
```markdown
## Context

Sentinel requires two authentication methods:
1. Admin users (web interface) need email/password auth
2. Kiosk terminals (automated scans) need long-lived API keys

Our custom JWT implementation lacks API key support and requires
significant maintenance.
```

✅ **List alternatives**
```markdown
## Options Considered

### 1. Custom JWT + Build API Keys
- Pro: Full control
- Con: High maintenance, security risk

### 2. Auth0 / External Service
- Pro: Battle-tested
- Con: Cost, external dependency, overkill

### 3. better-auth (chosen)
- Pro: Built-in API keys, type-safe, Prisma adapter
- Con: Learning curve
```

✅ **Be honest about consequences**
```markdown
## Consequences

Positive:
- API key support out of the box
- Less code to maintain
- Better security (library handles edge cases)

Negative:
- Migration effort from old system
- Team needs to learn better-auth
- Some customization may be harder
```

### Don't

❌ **Be vague**
```markdown
## Context

We need better auth.

## Decision

Use better-auth.

[No explanation of why or alternatives]
```

❌ **Edit after acceptance**
```markdown
<!-- ADR accepted 2026-01-15 -->
<!-- Edited 2026-02-01: Actually we changed our mind... -->
```

**Fix:** Create new ADR that supersedes the old one

❌ **Make it too technical**
```markdown
## Context

The OAuth2 implicit grant flow with PKCE extension using
SHA-256 hashing of the code verifier...

[Too detailed, loses the decision context]
```

---

## Numbering ADRs

### Next Number

**Check existing ADRs:**
```bash
ls docs/decisions/adr/*.md | grep -E '^[0-9]' | sort | tail -1
```

Use next sequential number.

### Zero-Padding

Always use 4 digits:
- `0001` not `1`
- `0010` not `10`
- `0100` not `100`

**Why:** Proper alphabetical sorting

---

## Updating ADRs

### Immutability Rule

**Once accepted, ADRs are immutable.**

**Why:**
- Historical record
- Context for future decisions
- Accountability

### When Decision Changes

**Don't** edit the old ADR.

**Do** create new ADR:
```markdown
<!-- 0005-new-auth-approach.md -->
# ADR-0005: Switch to Auth0

**Supersedes:** [ADR-0002](0002-better-auth-adoption.md)

**Status:** Accepted

## Context

After 6 months with better-auth, we discovered...
[Why changing]

## Decision

Switch to Auth0.

## Consequences

[What this means]
```

**And update old ADR status:**
```markdown
<!-- 0002-better-auth-adoption.md -->
**Status:** Superseded by [ADR-0005](0005-new-auth-approach.md)

[Rest of ADR unchanged]
```

---

## Index Management

### adr/index.md

Keep updated:

```markdown
# Architecture Decision Records

## Active

| # | Title | Status | Date |
|---|-------|--------|------|
| [0003](0003-ts-rest-contracts.md) | Use ts-rest for API Contracts | Accepted | 2026-01-18 |
| [0002](0002-better-auth-adoption.md) | Adopt Better-Auth | Superseded | 2026-01-15 |
| [0001](0001-integration-first-testing.md) | Integration-First Testing | Accepted | 2026-01-10 |

## Deprecated

| # | Title | Deprecated | Reason |
|---|-------|------------|--------|
| [0002](0002-better-auth-adoption.md) | Better-Auth | 2026-02-01 | See ADR-0005 |
```

---

## Related Documentation

**RFC process:**
- [RFC CLAUDE.md](../rfc/CLAUDE.md) - Proposals before decisions

**Templates:**
- [ADR Template](../../templates/adr.md)

**Decisions parent:**
- [Decisions CLAUDE.md](../CLAUDE.md)

---

**Last Updated:** 2026-01-19
