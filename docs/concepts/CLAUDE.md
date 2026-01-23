# CLAUDE Rules: Atomic Concepts

## Scope

Applies when creating documentation in: `docs/concepts/`

## Non-Negotiables (MUST / MUST NOT)

**Atomic Principle**:

- MUST document single concept per file
- MUST keep brief (200-500 tokens ideal)
- MUST NOT mix multiple concepts in one file
- MUST include practical example

**File Naming**:

- MUST use simple noun phrase: `repository-pattern.md`, `dependency-injection.md`
- MUST use 1-3 words maximum
- MUST NOT use type prefix
- MUST NOT abbreviate

**Structure**:

- MUST include: Definition, What It Is, When to Use, Example, Related
- MUST provide one-sentence definition
- MUST include code or practical example
- MUST link to related concepts and guides

## Defaults (SHOULD)

**Content Quality**:

- SHOULD be token-efficient (optimized for AI context loading)
- SHOULD link densely to related concepts
- SHOULD reference actual codebase examples

**Organization**:

- SHOULD NOT create index.md (self-organizing by filename)
- SHOULD cross-reference from guides and domain docs

## Workflow

**When documenting concept**:

1. Verify it's atomic (single concept only)
2. Create file with simple noun phrase name
3. Write brief definition and explanation
4. Add practical example from codebase
5. Link to related concepts and how-to guides

**Concept vs Explanation**:

- Concept: Quick definition + example (200-500 tokens)
- Explanation: Deep understanding + rationale (1000-3000 tokens)
- Relationship: Concept is quick reference, Explanation is deep dive

## Quick Reference

**Purpose**: Single-concept definitions for efficient AI context loading

**Pattern**: `simple-noun-phrase.md`

**Good Examples**:

- `repository-pattern.md`
- `integration-testing.md`
- `dependency-injection.md`
- `testcontainers.md`

**Bad Examples**:

- `testing-everything.md` - too broad
- `what-is-integration-testing.md` - verbose
- `int-test.md` - abbreviated
