---
name: frontend-ux-ui-guardrails
description: Enforces Sentinel frontend design quality for apps/frontend-admin with DaisyUI-first implementation and DaisyUI Blueprint MCP lookup.
---

# Frontend UX/UI Guardrails

## Use this skill when

- Editing or creating UI in `apps/frontend-admin/**`
- Improving modal/page/component UX or visual quality
- Verifying that visual changes did not regress neighboring UI

## Workflow

1. Read required project design sources:

- `docs/design/design-principles.md`
- `docs/design/style-guide.md`
- `apps/frontend-admin/src/styles/tokens.css`
- `apps/frontend-admin/src/app/globals.css`
- nearest `AGENTS.md` / `CLAUDE.md`

2. Enforce DaisyUI-first design:

- Query `mcp__daisyui-blueprint__daisyUI-Snippets` for relevant components before building new UI patterns.
- If a relevant DaisyUI pattern exists, start from it and adapt to Sentinel constraints.
- If no suitable snippet exists, document why custom implementation is necessary.

3. Apply Sentinel semantics:

- Use `AppCard` for content containers where applicable.
- Use `AppBadge` for status-only indicators.
- Use `Chip` for decorative labels/tags.
- Use token-based spacing/elevation/timing and avoid magic numbers.
- Use the Sentinel DaisyUI theme token inventory from `apps/frontend-admin/src/app/globals.css`:
  `base-100/200/300/400/500`, `base-content`, and every semantic family’s
  `color`, `content`, `fadded`, and `fadded-content` pair for `primary`,
  `secondary`, `accent`, `neutral`, `info`, `success`, `warning`, and `error`.

4. Perform a post-change visual sanity pass before finishing any layout/UX work:

- Inspect the rendered UI after implementation, not just the code and build output.
- Check for overflow, clipped focus rings, hidden inputs/actions, duplicate control bands, awkward spacing, unnecessary scrollbars, and broken responsive behavior.
- Use a `1920x1080` browser window for Playwright verification in this repo.
- If the result looks wrong, iterate before presenting the work as complete.

5. Use `playwright-cli` for rendered verification when the change materially affects layout or when the user reports a visual problem:

- Prefer route-level verification with screenshots or direct observations when the route is available locally.
- Treat `playwright-cli` as required for layout-heavy modal/page work unless the route is inaccessible; if inaccessible, state the limitation explicitly.
- Use `references/three-round-visual-qa.md` when the request specifically asks for a three-round visual QA pass.

6. Required completion evidence (frontend tasks):

- `DaisyUI Fit Check`
- `Research Notes`
- `Design Compliance Checklist`
- `Visual Sanity Check`

## Required outputs format

For every frontend change, include:

### DaisyUI Fit Check

- Target UI element(s)
- DaisyUI snippet/component considered
- Decision (used/adapted/custom fallback) and reason

### Research Notes

- Sources reviewed
- Candidate pattern options
- Chosen pattern and tradeoff rationale

### Design Compliance Checklist

- AppCard/AppBadge/Chip usage compliance
- Token usage compliance
- Semantic color usage compliance
- Motion/accessibility compliance

### Visual Sanity Check

- Route or UI surface reviewed
- Viewport checked (`1920x1080`)
- What was inspected
- Result or remaining issue

### Visual QA Evidence (Only if requested)

- Route(s), actions, artifact refs, and result summary

## References

- `references/three-round-visual-qa.md`
