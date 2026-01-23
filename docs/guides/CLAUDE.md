# CLAUDE Rules: Guides Documentation

## Scope

Applies when creating documentation in: `docs/guides/`

## Non-Negotiables (MUST / MUST NOT)

**Organization**:

- MUST organize by Diátaxis type (tutorial, howto, reference, explanation)
- MUST put document type before business domain
- MUST use correct subdirectory for document type
- MUST NOT mix types in single document

**File Naming**:

- MUST use kebab-case
- MUST NOT use type prefix in filename (implied by directory)
- In `tutorials/`: `getting-started.md` (NOT `tutorial-getting-started.md`)

## Defaults (SHOULD)

**When to Use Guides**:

- SHOULD use when document type is more important than domain
- SHOULD use for cross-domain tutorials, references, explanations
- SHOULD cross-reference to domain docs when relevant

## Workflow

**When creating guide**:

1. Determine document type (tutorial, howto, reference, explanation)
2. Choose appropriate subdirectory
3. Use template from `@docs/templates/`
4. Add frontmatter with AI triggers
5. Update index.md if applicable

**Classification decision**:

- Learning oriented ("I want to learn") → tutorials/
- Task oriented ("I need to do X") → howto/
- Reference oriented ("What is X?") → reference/
- Conceptual ("Why X?") → explanation/

**Guides vs Domains**:

- Document type most important → Use `docs/guides/`
- Business domain most important → Use `docs/domains/`

## Quick Reference

**Diátaxis Types**:

| Type        | Purpose       | User Need                  | Directory    |
| ----------- | ------------- | -------------------------- | ------------ |
| Tutorial    | Learning      | "I want to learn"          | tutorials/   |
| How-to      | Solving       | "I need to accomplish X"   | howto/       |
| Reference   | Lookup        | "I need to look up X"      | reference/   |
| Explanation | Understanding | "I want to understand why" | explanation/ |

**Subdirectories**: `tutorials/`, `howto/`, `reference/`, `explanation/`
