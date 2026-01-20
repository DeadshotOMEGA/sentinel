# Architecture Decision Records (ADR) Index

**Purpose:** Immutable record of all architectural decisions

**Last Updated:** 2026-01-19

---

## What Are ADRs?

Architecture Decision Records document:
- What was decided
- Why it was decided
- Alternatives considered
- Consequences (benefits and drawbacks)
- Related decisions

**Key Principle:** ADRs are **immutable** - never edited after approval

---

## Decision Status

| Status | Count | Description |
|--------|-------|-------------|
| Proposed | 0 | Under review |
| Accepted | 0 | Approved and active |
| Deprecated | 0 | Superseded but kept for history |
| Rejected | 0 | Proposed but not approved |

**Total ADRs:** 0

---

## All Decisions (Chronological)

| ADR | Title | Status | Date | Supersedes | Superseded By |
|-----|-------|--------|------|------------|---------------|
| *No ADRs yet* | - | - | - | - | - |

---

## Decisions by Domain

### Authentication & Authorization
*No ADRs yet*

### Testing & Quality
*No ADRs yet*

### Architecture & Infrastructure
*No ADRs yet*

### Data & Persistence
*No ADRs yet*

### Frontend
*No ADRs yet*

---

## Decisions by Category

### Technology Selection
*No ADRs yet*

### Architectural Patterns
*No ADRs yet*

### Process & Workflow
*No ADRs yet*

### Security
*No ADRs yet*

---

## Planned ADRs

Based on current work, these ADRs should be created:

- [ ] **0001-integration-first-testing.md** - Why integration tests over unit tests
- [ ] **0002-better-auth-adoption.md** - Why better-auth vs custom JWT
- [ ] **0003-testcontainers-usage.md** - Testing with real databases
- [ ] **0004-monorepo-structure.md** - pnpm workspaces organization
- [ ] **0005-ts-rest-adoption.md** - ts-rest + Valibot for contracts
- [ ] **0006-heroui-framework.md** - Why HeroUI for frontend components

**See:** [Backend Rebuild Plan](../../plans/active/backend-rebuild-plan.md) for context

---

## Creating ADRs

**When to create:**
- Major technology choice
- Architectural pattern adoption
- Process change
- Security decision
- Breaking changes

**How to create:**
1. Copy template: `cp docs/templates/adr.md docs/decisions/adr/NNNN-short-title.md`
2. Use sequential numbering (0001, 0002, etc.)
3. Fill in all sections (Context, Decision, Alternatives, Consequences)
4. Get review/approval
5. Mark as Accepted
6. **Never edit after acceptance** (create superseding ADR if needed)
7. Add to this index

**See:** [ADR Format Guide](CLAUDE.md) for complete guide

---

## ADR Naming Convention

**Pattern:** `NNNN-short-kebab-case-title.md`

**Examples:**
- `0001-integration-first-testing.md`
- `0002-better-auth-adoption.md`
- `0042-deprecate-custom-jwt.md`

**Numbering:**
- Zero-padded (0001, not 1)
- Sequential (never reuse numbers)
- No gaps (if 0005 rejected, still create 0006 next)

---

## Superseding Decisions

When a decision changes:

1. **Don't edit** original ADR
2. Create **new ADR** with new number
3. Add `supersedes: 0001` to new ADR frontmatter
4. Add `superseded_by: 0042` to old ADR frontmatter
5. Change old ADR status to `deprecated`
6. Update this index

**Example:**
```yaml
---
# ADR 0042 (new)
supersedes: 0001
status: accepted
---

# ADR 0001 (old)
superseded_by: 0042
status: deprecated
```

---

## Search ADRs

**By keyword:**
```bash
rg "testing|authentication|monorepo" docs/decisions/adr/
```

**By status:**
```bash
rg "status: accepted" docs/decisions/adr/
```

**By technology:**
```bash
rg "better-auth|testcontainers|ts-rest" docs/decisions/adr/
```

---

## ADR Statistics

- **Total ADRs:** 0
- **Accepted:** 0
- **Deprecated:** 0
- **Rejected:** 0
- **Average Time to Decision:** N/A

---

## Related Documentation

- [ADR Format Guide](CLAUDE.md) - How to write ADRs
- [ADR Template](../../templates/adr.md) - Starting template
- [RFC Index](../rfc/index.md) - Proposals before decisions
- [Research Index](../../research/index.md) - Investigation findings
- [Plans Index](../../plans/index.md) - Implementation plans

---

## Quick Links

- [Backend Rebuild Plan](../../plans/active/backend-rebuild-plan.md) - Current project
- [Documentation System Plan](../../plans/active/ai-first-documentation-system.md) - Doc structure
