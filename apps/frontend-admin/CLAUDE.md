# CLAUDE Rules: Frontend Admin

## Scope

Applies when editing files under: `apps/frontend-admin/`

## Required Reading

Before implementing frontend changes, read:

- `docs/design/design-principles.md`
- `docs/design/style-guide.md`
- `apps/frontend-admin/src/styles/tokens.css`
- `apps/frontend-admin/src/app/globals.css`

## Non-Negotiables (MUST / MUST NOT)

- MUST use DaisyUI components when available.
- MUST query DaisyUI Blueprint MCP (`mcp__daisyui-blueprint__daisyUI-Snippets`) before inventing new custom component patterns.
- MUST use project wrappers for semantic consistency (`AppCard`, `AppBadge`, `Chip`, and `Dialog` primitives).
- MUST use design tokens for spacing, elevation, z-index, and transition timing.
- MUST use `playwright-cli` to verify all edited/new frontend components/pages.
- MUST execute exactly 3 visual QA rounds in order:
  1. Targeted correctness
  2. Adjacent/related regressions
  3. Cross-page/layout consistency
- MUST restart from Round 1 if any visual defect is found and fixed.
- MUST provide these sections in completion output for frontend work:
  - `DaisyUI Fit Check`
  - `Research Notes`
  - `Design Compliance Checklist`
  - `3-Round Visual QA Evidence`
- MUST NOT complete frontend tasks without all 3 QA rounds documented as passing.

## Defaults (SHOULD)

- SHOULD prefer information density and utilitarian layout.
- SHOULD keep motion functional and respect `prefers-reduced-motion`.
- SHOULD avoid decorative semantic color use.
