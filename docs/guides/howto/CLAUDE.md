# CLAUDE Rules: How-to Guides

## Scope

Applies when creating documentation in: `docs/guides/howto/`

## Non-Negotiables (MUST / MUST NOT)

**Content Type**:

- MUST be task-oriented practical solutions
- MUST solve specific problems (NOT teaching or explaining)
- MUST include goal statement and verification steps
- MUST use kebab-case filenames with action verbs

**Structure**:

- MUST include: Goal (1 sentence), Prerequisites, Steps, Verification
- MUST be direct and concise (minimal explanation)
- MUST provide code/command examples
- MUST NOT teach concepts (assume familiarity)

## Defaults (SHOULD)

**Writing Style**:

- SHOULD be expert-to-expert tone
- SHOULD focus on the task, not concepts
- SHOULD include troubleshooting section for common issues

**Organization**:

- SHOULD use action-based names: `add-repository.md`, `deploy-production.md`
- SHOULD link to related tutorials and explanations

## Workflow

**When to create how-to**:

1. Users ask "how do I X?" repeatedly (3+ times)
2. Common task with multiple steps
3. Process could be done incorrectly without guidance
4. Specific problem needs documented solution

**When NOT to create how-to**:

- Teaching concepts → Use tutorial
- Listing specs → Use reference
- Explaining why → Use explanation

## Quick Reference

**Template**: `@docs/templates/howto.md`

**Characteristics**:

- Task-oriented (solves specific problem)
- Minimal explanation (just enough to complete)
- Assumes familiarity (not for beginners)
- Result-focused (get to solution quickly)
