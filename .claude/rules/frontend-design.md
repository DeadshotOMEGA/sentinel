---
paths:
  - 'apps/frontend-admin/**'
---

# CLAUDE Rules: Frontend Design System

## Scope

Applies when editing files under: `apps/frontend-admin/`

## Required Reading

Before implementing frontend work, read:

- `docs/design/design-principles.md` — visual philosophy, semantic colors, elevation
- `docs/design/style-guide.md` — concrete rules, component selection, anti-patterns
- `apps/frontend-admin/src/styles/tokens.css` — spacing, shadows, z-index, durations
- `apps/frontend-admin/src/app/globals.css` — DaisyUI theme, animations, utilities

## Non-Negotiables (MUST / MUST NOT)

- MUST use `AppCard` for content containers (NOT shadcn Card)
- MUST use `AppBadge` for status indicators (NOT shadcn Badge)
- MUST use `Chip` for tag/category labels
- MUST use `--space-*` tokens for spacing (NOT magic numbers)
- MUST use OKLCH semantic color tokens (`primary`, `secondary`, `accent`, `info`, `success`, `warning`, `error`)
- MUST use `-fadded` variants for soft backgrounds/banners (e.g., `bg-success-fadded text-success-fadded-content`)
- MUST use full-strength colors only for buttons, badges, strong emphasis
- MUST respect `prefers-reduced-motion` for all non-essential animation
- MUST NOT use semantic colors for decoration
- MUST NOT nest cards inside cards
- MUST NOT add animations that delay user interaction
- MUST NOT use gradients except for subtle depth cues

## Defaults (SHOULD)

- SHOULD maximize information density over white space
- SHOULD prefer tables/grids over cards for list data
- SHOULD use `font-display` (DM Sans) for h1-h2, `font-sans` (Roboto) for body, `font-mono` (Roboto Mono) for data/timestamps
- SHOULD limit transitions to 200-300ms subtle fades
- SHOULD follow naval operations center aesthetic: dense, professional, utilitarian
