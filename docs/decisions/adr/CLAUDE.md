# CLAUDE Rules: Architecture Decision Records

## Scope

Applies when creating documentation in: `docs/decisions/adr/`

## Non-Negotiables (MUST / MUST NOT)

**File Naming**:

- MUST use sequential numbering: `0001-title.md`, `0002-title.md`
- MUST use zero-padded 4 digits (0001 not 1)
- MUST use kebab-case for title

**Structure**:

- MUST follow: Context → Decision → Options Considered → Consequences
- MUST include Status field (Proposed, Accepted, Deprecated, Superseded)
- MUST include Date field
- MUST list alternatives considered

**Immutability**:

- MUST be immutable once accepted (create new ADR if decision changes)
- MUST NOT edit accepted ADRs (except status field)
- MUST link to superseding ADR when deprecated

## Defaults (SHOULD)

**When to Create**:

- SHOULD create for technology choices (libraries, frameworks)
- SHOULD create for architectural patterns
- SHOULD create for design decisions with long-term impact
- SHOULD NOT create for implementation details or temporary decisions

**Content Quality**:

- SHOULD provide clear context for decision
- SHOULD list all alternatives considered with pros/cons
- SHOULD be honest about consequences (positive and negative)

**Organization**:

- SHOULD maintain index.md with active and deprecated ADRs
- SHOULD cross-reference related RFCs and plans
- SHOULD update old ADR status when superseded

## Workflow

**When making significant decision**:

1. Check existing ADRs for next number
2. Create file with next sequential number
3. Use ADR template from `@docs/templates/`
4. Document Context, Decision, Options, Consequences
5. Set Status (usually Proposed initially)
6. Update to Accepted when approved
7. Add to index.md

**When decision changes**:

1. Create NEW ADR that supersedes old one
2. Update old ADR status to "Superseded by ADR-XXXX"
3. Do NOT edit old ADR content (immutable)

## Status Values

- **Proposed**: Decision being considered
- **Accepted**: Decision approved (immutable)
- **Deprecated**: No longer recommended
- **Superseded**: Replaced by newer ADR

## When to Create ADR

- MUST create for technology choices (libraries, frameworks)
- MUST create for architectural patterns
- MUST create for design decisions with long-term impact
- MUST NOT create for implementation details or temporary decisions
