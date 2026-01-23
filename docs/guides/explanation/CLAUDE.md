# CLAUDE Rules: Explanations

## Scope

Applies when creating documentation in: `docs/guides/explanation/`

## Non-Negotiables (MUST / MUST NOT)

**Content Type**:

- MUST be understanding-oriented conceptual documentation
- MUST explain why and provide rationale (NOT how-to or reference)
- MUST explore trade-offs and alternatives
- MUST use kebab-case filenames

**Structure**:

- MUST include: Context, Concept/Pattern, Rationale, Trade-offs, Alternatives
- MUST discuss pros and cons
- MUST link to related ADRs for formal decisions
- MUST NOT turn into step-by-step instructions

## Defaults (SHOULD)

**Writing Style**:

- SHOULD be thoughtful and analytical
- SHOULD use narrative flow
- SHOULD explore alternatives objectively

**Organization**:

- SHOULD use concept names: `testing-philosophy.md`, `auth-architecture.md`
- SHOULD link to related how-tos and tutorials

## Workflow

**When to create explanation**:

1. Architecture decision needs background context
2. Design pattern requires understanding
3. Users ask "why do we X?"
4. Complex concept needs clarification
5. Trade-offs should be documented

**When NOT to create explanation**:

- Teaching how to use → Use tutorial
- Solving tasks → Use how-to
- Listing specs → Use reference

**Explanation vs ADR**:

- Explanation: Broad conceptual understanding (can be updated)
- ADR: Specific decision record (immutable, formal)
- Relationship: Explanation provides background, ADR records decision

## Quick Reference

**Template**: `@docs/templates/explanation.md`

**Characteristics**:

- Understanding-oriented (illuminates concepts)
- Conceptual (why, not how)
- Analytical (explores trade-offs)
- Thoughtful (considers alternatives)
