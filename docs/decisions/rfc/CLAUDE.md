# CLAUDE Rules: Request for Comments

## Scope

Applies when creating documentation in: `docs/decisions/rfc/`

## Non-Negotiables (MUST / MUST NOT)

**File Naming**:

- MUST use date prefix: `YYYY-MM-DD-descriptive-title.md`
- MUST use creation date (today)
- MUST use kebab-case

**Examples**:

- `2026-01-15-backend-rebuild-proposal.md`
- `2026-02-01-real-time-notifications.md`

**Structure**:

- MUST include: Problem, Goals, Non-Goals, Proposal, Alternatives, Risks, Rollout
- MUST include Status field (Draft, Discussion, Accepted, Rejected)
- MUST document alternatives considered with pros/cons
- MUST identify risks honestly

**When Accepted**:

- MUST create corresponding ADR
- MUST link RFC to resulting ADR
- MUST update RFC status to "Accepted"

## Defaults (SHOULD)

**When to Create**:

- SHOULD create for major system changes
- SHOULD create when multiple viable approaches exist
- SHOULD create when team consensus needed
- SHOULD NOT create for bug fixes or obvious solutions

**Process**:

- SHOULD allow 1-2 weeks for discussion
- SHOULD document discussion and decisions
- SHOULD update index.md when created

## Workflow

**When proposing major change**:

1. Create RFC with today's date
2. Use RFC template from `@docs/templates/rfc.md`
3. Set status to "Draft"
4. Include all required sections (Problem, Proposal, Alternatives, Risks)
5. Update status to "Discussion" when ready for review
6. When accepted: Create ADR, link between RFC and ADR
7. Add to index.md

## Quick Reference

**Status Values**:

- **Draft** - Author still writing
- **Discussion** - Ready for team review
- **Accepted** - Team consensus, create ADR next
- **Rejected** - Not proceeding, document why

**RFC → ADR Flow**:

- Draft status: Author writing
- Discussion status: Ready for team review
- Accepted status: Consensus reached, create corresponding ADR
- MUST link RFC to resulting ADR when accepted

**Related**:

- [RFC Template](../../templates/rfc.md)
