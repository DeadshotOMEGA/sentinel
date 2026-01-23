# CLAUDE Rules: Decisions Documentation

## Scope

Applies when creating documentation in: `docs/decisions/`

## Non-Negotiables (MUST / MUST NOT)

**ADRs** (Architecture Decision Records):

- MUST use sequential numbering: `0001-title.md`, `0002-title.md`
- MUST include Status field (Proposed, Accepted, Deprecated, Superseded)
- MUST be immutable once accepted (create new ADR if decision changes)
- MUST follow structure: Context → Decision → Consequences

**RFCs** (Request for Comments):

- MUST use date prefix: `YYYY-MM-DD-title.md`
- MUST include Status field (Draft, Discussion, Accepted, Rejected)
- MUST follow structure: Problem → Proposal → Alternatives → Discussion
- MUST link to resulting ADR when accepted

## Defaults (SHOULD)

**When to Document**:

- SHOULD create ADR for technology choices, architectural patterns, significant trade-offs
- SHOULD create RFC for major changes needing consensus
- SHOULD NOT document implementation details, obvious choices, personal preferences

**Organization**:

- SHOULD maintain index.md in adr/ and rfc/ subdirectories
- SHOULD cross-reference RFC → ADR when proposal is accepted
- SHOULD update old ADR status when superseded

## Workflow

**When making significant decision**:

1. Determine if consensus needed (RFC) or decision made (ADR)
2. Use appropriate template from `@docs/templates/`
3. Add to subdirectory (adr/ or rfc/)
4. Update index.md
5. Link from this file if major decision

**Decision workflow**:

1. Identify problem
2. Create RFC for major decisions or ADR for minor decisions
3. Facilitate team discussion
4. Reach consensus
5. Create ADR to record decision
6. Proceed to implementation

**For minor decisions**: MUST skip RFC and create ADR directly

## Quick Reference

**ADRs** (Immutable Records):

- Technology choices (better-auth, ts-rest, Prisma)
- Architectural patterns (monorepo, integration-first testing)
- Significant design decisions
- Format: `0001-short-title.md`

**RFCs** (Proposals):

- Major system changes
- Breaking changes
- Multiple viable approaches
- Format: `YYYY-MM-DD-descriptive-title.md`

**Related**:

- [ADR Template](../templates/adr.md)
- [RFC Template](../templates/rfc.md)
