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

4. Perform visual QA using `playwright-cli` only when explicitly requested:

- Use `references/three-round-visual-qa.md` when the request specifically asks for a three-round visual QA pass.

5. Required completion evidence (frontend tasks):

- `DaisyUI Fit Check`
- `Research Notes`
- `Design Compliance Checklist`

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

### Visual QA Evidence (Only if requested)

- Route(s), actions, artifact refs, and result summary

## References

- `references/three-round-visual-qa.md`
