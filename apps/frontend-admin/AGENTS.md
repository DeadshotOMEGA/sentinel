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
- MUST check available DaisyUI patterns with `mcp__daisyui__daisyUI_Snippets` before building new custom UI primitives.
- MUST use Sentinel wrappers when they encode project standards:
  - `AppCard` for content containers
  - `AppBadge` for status indicators
  - `Chip` for decorative tags/categories
  - `Dialog` primitives for modal behavior
- MUST optimize task flows and modals for glanceability and rapid scanning.
- MUST use one primary heading per modal and avoid stacked heading/subheading/helper text unless essential.
- MUST show only the minimum information needed for the next action.
- MUST emphasize blockers and actionable risk states; de-emphasize already satisfied conditions.
- MUST prefer one inline instruction near the relevant control instead of detached instruction blocks.
- MUST collapse optional details and fully satisfied checks by default.
- MUST design each modal around one task and one dominant action.
- MUST use plain language and sentence case for modal labels, headings, instructions, and status text.
- MUST reduce duplicate labels and repeated status wording in the same modal.
- MUST use token-based styling (`--space-*`, z-index tokens, duration tokens); no magic-number spacing for new changes.
- MUST perform a post-change visual sanity check for frontend layout/UX work before considering the task complete.
- MUST check for obvious overflow, clipping, awkward density, duplicate action bands, hidden controls, and unnecessary scrollbars.
- MUST treat `apps/frontend-admin` as a desktop-only webapp for Playwright verification and test authoring unless the product requirements explicitly change.
- MUST use a `1920x1080` browser window for all Codex Playwright verification in this repo.
- MUST NOT add mobile, tablet, or responsive-breakpoint Playwright coverage for `apps/frontend-admin` unless the task explicitly requires a product change away from the desktop-only constraint.
- MUST use `playwright-cli` for the visual sanity check when the task is primarily about frontend layout/UX, when the user reports a visual defect, or when a local route is available and the change materially affects layout.
- MUST NOT use Playwright MCP tools for frontend verification when `playwright-cli` is available.
- MUST use the Sentinel bootstrap account (`0000000000` / `0000`) or a freshly generated `playwright-cli` auth state unless the task explicitly requires a different login.
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
- SHOULD evaluate new UX changes against the NN/g 10 usability heuristics baseline in `docs/design/design-principles.md`.
