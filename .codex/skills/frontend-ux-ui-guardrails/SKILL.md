---
name: frontend-ux-ui-guardrails
description: Enforces Sentinel frontend design quality for apps/frontend-admin with DaisyUI-first implementation, DaisyUI Blueprint MCP lookup, and mandatory 3-round playwright-cli visual QA for every edited/new component or page.
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

4. Perform mandatory 3-round visual QA using `playwright-cli`:

- Follow `references/three-round-visual-qa.md` exactly.
- If any round fails, fix and restart from Round 1.

5. Required completion evidence (frontend tasks):

- `DaisyUI Fit Check`
- `Research Notes`
- `Design Compliance Checklist`
- `3-Round Visual QA Evidence`

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

### 3-Round Visual QA Evidence

- Round 1: route, actions, artifact refs, result
- Round 2: route, actions, artifact refs, result
- Round 3: route, actions, artifact refs, result
- If fixed issues occurred, note restart from Round 1

## References

- `references/three-round-visual-qa.md`
