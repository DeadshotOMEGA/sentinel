# Local Codex Instructions (Frontend Admin)

## Scope

Applies when editing files under: `apps/frontend-admin/`

## Source of Truth and Precedence

- Read and follow nearest `AGENTS.md` and `CLAUDE.md` first.
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
- MUST include frontend evidence sections in completion responses:
  - `DaisyUI Fit Check`
  - `Research Notes`
  - `Design Compliance Checklist`
  - `3-Round Visual QA Evidence`
- MUST use `playwright-cli` for visual verification of every edited/new component or page.
- MUST perform exactly 3 visual QA rounds in this order:
  1. Targeted component/page correctness
  2. Adjacent/related regression checks on same route and nearby interactions/states
  3. Cross-page/layout consistency (shell, spacing, typography, shared UI patterns)
- MUST restart QA from Round 1 if any round fails after applying fixes.
- MUST NOT mark frontend work complete without passing evidence from all 3 rounds.

## Defaults (SHOULD)

- SHOULD prefer dense, operational layouts over decorative whitespace.
- SHOULD use semantic colors only for semantic meaning, not decoration.
- SHOULD keep transitions subtle and honor `prefers-reduced-motion`.
