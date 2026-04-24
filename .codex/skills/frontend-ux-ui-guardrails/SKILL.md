---
name: frontend-ux-ui-guardrails
description: Enforces Sentinel frontend design quality for apps/frontend-admin with DaisyUI-first implementation and DaisyUI Blueprint MCP lookup.
---

## Sentinel UX Design Canon (Learned Baseline)

When designing or redesigning pages in `apps/frontend-admin`, default to the established Sentinel admin style demonstrated by the successful Updates page redesign.

### Product Feel

Interfaces should feel:

- calm
- operational
- dependable
- professional
- efficient
- military-internal-tool quality

Avoid flashy SaaS trends, playful styling, excessive gradients, or decorative clutter.

### Visual Hierarchy Rule

A user should understand the page in 3 seconds:

1. Current page / purpose
2. Current status
3. Primary action
4. Key metrics
5. Secondary tools

### Surface Hierarchy

Prefer three tonal layers:

1. App/page canvas
2. Standard content surfaces
3. Emphasized semantic surfaces

Avoid flat white-box repetition.

### Semantic Color Rules

Use restrained semantic tinting:

- Success/Healthy/Current = green
- Actions/Tools/Info = blue
- Warning = amber
- Failure = red
- Passive/History = neutral

Use color for meaning, not decoration.

### KPI Rules

Values should visually outrank labels.

Examples:

- versions
- counts
- timestamps
- statuses

Large value, smaller label, concise supporting text.

### Layout Patterns

When suitable, prefer:

- Left: activity/history/content
- Right: actions/tools/recovery/context

### Border Discipline

Too many borders create low-quality enterprise UI.

Prefer spacing, surface contrast, shadows, and typography before adding borders.

### Density Rules

Sentinel admin UI is desktop-first and operational.

Prefer efficient layouts with intentional spacing. Avoid oversized mobile-first whitespace unless explicitly requested.

### Reuse Rule

Before inventing a new page style, inspect the current Updates page and align new work to its tone, spacing rhythm, hierarchy, and surface treatment.

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
- For `apps/frontend-admin`, treat the product as desktop-only unless the user explicitly changes the requirement.
- Check for overflow, clipped focus rings, hidden inputs/actions, duplicate control bands, awkward spacing, and unnecessary scrollbars at the fixed desktop viewport.
- Use a `1920x1080` browser window for Playwright verification in this repo.
- Do not run mobile, tablet, or responsive-breakpoint Playwright QA for `apps/frontend-admin` unless the task explicitly requires a product change away from the desktop-only constraint.
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
