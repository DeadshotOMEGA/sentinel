# CLAUDE Rules: Meta Documentation

## Scope

Applies when creating documentation in: `docs/meta/`

## Non-Negotiables (MUST / MUST NOT)

**Content Type**:

- MUST document the documentation system itself (meta-level)
- MUST be about how to write/organize/maintain documentation
- MUST NOT be about specific features or domains
- MUST use kebab-case filenames

**Organization**:

- MUST separate standards (style-guide.md) from strategies (ai-first-principles.md)
- MUST follow Diátaxis classification (most meta docs are explanation or reference)

## Defaults (SHOULD)

**Content Coverage**:

- SHOULD document writing conventions (style guide)
- SHOULD document AI optimization strategies
- SHOULD document health tracking and monitoring
- SHOULD document Diátaxis classification rules

**When to Create Meta Doc**:

- SHOULD create when documentation process needs standardization
- SHOULD create when writers ask same questions repeatedly
- SHOULD create when quality inconsistency observed

## Workflow

**When documenting documentation system**:

1. Verify it's about documentation itself (NOT about features)
2. Choose appropriate topic (style, AI, health, classification)
3. Use explanation or reference template
4. Add frontmatter with meta-related AI triggers
5. Link from this file's Quick Reference

**Meta vs Root docs/**:

- Root docs/: Navigation and quick reference (overview level)
- Meta docs: Complete standards and detailed conventions

## Quick Reference

**Planned Meta Documents**:

- `style-guide.md` - Complete writing conventions
- `ai-first-principles.md` - AI optimization strategies
- `health-tracking.md` - Documentation health monitoring
- `diataxis-guide.md` - Complete classification guide

**For New Contributors**:

1. Read `docs/README.md` - Navigation
2. Browse `docs/templates/` - Templates for each doc type
3. Read `docs/meta/style-guide.md` - Writing standards (when created)
