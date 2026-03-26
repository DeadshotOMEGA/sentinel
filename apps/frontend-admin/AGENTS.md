# Local Codex Instructions (Frontend Admin)

## Scope

Applies when editing files under: `apps/frontend-admin/`

## Source of Truth and Precedence

- Read and follow nearest `AGENTS.md` first.
- Frontend visual/design constraints here are mandatory.
- In conflicts: closest file wins; `MUST`/`MUST NOT` override `SHOULD`.

## Required Reading Before Frontend Changes

- `docs/design/design-principles.md`
- `docs/design/style-guide.md`
- `apps/frontend-admin/src/styles/tokens.css`
- `apps/frontend-admin/src/app/globals.css`

## Non-Negotiables (MUST / MUST NOT)

- MUST use DaisyUI components/classes when equivalent functionality exists.
- MUST check available DaisyUI patterns with `mcp__daisyui-blueprint__daisyUI-Snippets` before building new custom UI primitives.
- MUST use Sentinel wrappers when they encode project standards:
  - `AppCard` for content containers
  - `AppBadge` for status indicators
  - `Chip` for decorative tags/categories
  - `Dialog` primitives for modal behavior
- MUST use token-based styling (`--space-*`, z-index tokens, duration tokens); no magic-number spacing for new changes.
- MUST perform a post-change visual sanity check for frontend layout/UX work before considering the task complete.
- MUST check for obvious overflow, clipping, awkward density, duplicate action bands, hidden controls, and unnecessary scrollbars.
- MUST inspect the rendered UI at the user-reported problem viewport when one is provided; otherwise use at least one desktop viewport and one narrower viewport that could expose layout stress.
- MUST use `playwright-cli` for the visual sanity check when the task is primarily about frontend layout/UX, when the user reports a visual defect, or when a local route is available and the change materially affects layout.
- MUST include frontend evidence sections in completion responses:
  - `DaisyUI Fit Check`
  - `Research Notes`
  - `Design Compliance Checklist`
- MUST include a brief visual sanity-check result in the completion response for frontend layout/UX work, even when full visual QA is not requested.
- MUST use `playwright-cli` for visual verification when the user explicitly requests visual QA.

## Defaults (SHOULD)

- SHOULD prefer dense, operational layouts over decorative whitespace.
- SHOULD use semantic colors only for semantic meaning, not decoration.
- SHOULD keep transitions subtle and honor `prefers-reduced-motion`.
