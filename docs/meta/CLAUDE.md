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

**Meta vs Root CLAUDE.md**:
- Root CLAUDE.md: Navigation and quick reference (overview level)
- Meta docs: Complete standards and detailed conventions

## Quick Reference

**Current Status**: Phase 4 planned (meta docs to be created)

**Planned Meta Documents**:
- `style-guide.md` - Complete writing conventions
- `ai-first-principles.md` - AI optimization strategies
- `health-tracking.md` - Documentation health monitoring
- `diataxis-guide.md` - Complete classification guide

**Purpose**:
Meta docs explain how to write, organize, and maintain documentation.

**For New Contributors**:
1. Read `docs/README.md` - Navigation
2. Read `docs/CLAUDE.md` - AI-first overview
3. Read `docs/meta/style-guide.md` - Writing standards (when created)
4. Read `docs/templates/CLAUDE.md` - Templates usage
5. Start writing documentation

**Related**:
- [Root CLAUDE.md](../CLAUDE.md) - Documentation system overview
- [Templates](../templates/CLAUDE.md) - Document templates
- [AI-First Documentation Plan](../plans/active/2026-01-19-ai-first-documentation-system.md)
