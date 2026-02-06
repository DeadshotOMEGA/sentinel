---
name: Frontend-Design-UX-UI
description: Create production-grade frontend interfaces for Sentinel using the established design system. Use when building UI components, pages, or dashboards. Enforces naval operations center aesthetic, DaisyUI theming, and OKLCH color tokens.
license: Complete terms in LICENSE.txt
---

This skill guides creation of production-grade frontend interfaces for Sentinel following the established design system. The aesthetic is **naval operations center**: dense, professional, information-rich interfaces designed for operational clarity.

## Required Reading

Before implementing any frontend work, read these project resources:

1. **Design Principles**: `docs/design/design-principles.md` - Visual philosophy, semantic colors, elevation, typography
2. **Style Guide**: `docs/design/style-guide.md` - Concrete rules, component selection, anti-patterns
3. **Design Tokens**: `apps/frontend-admin/src/styles/tokens.css` - Spacing scale, shadows, z-index, durations
4. **Theme Definition**: `apps/frontend-admin/src/app/globals.css` - DaisyUI theme, animations, utility classes
5. **Color Palette**: `Color_Palette.png` - OKLCH color values for primary, secondary, accent, and semantic colors

## Visual Philosophy

### Information Density Over White Space

- Maximize data visibility per viewport
- Compact layouts that respect operator attention
- Tables and grids preferred over cards when displaying lists
- Avoid decorative spacing that wastes screen real estate

### Restrained Animation

- Animation serves function, not decoration
- Status changes may pulse briefly to draw attention
- Page transitions use subtle fades (200-300ms)
- `prefers-reduced-motion` disables all non-essential animation

### Professional Aesthetic

- Clean, utilitarian appearance
- No gradients except for subtle depth cues
- Icons are functional indicators, not decorations
- Typography prioritizes legibility over style

## Color System (OKLCH)

| Role      | Token               | OKLCH Value                  |
| --------- | ------------------- | ---------------------------- |
| Primary   | `--color-primary`   | `oklch(60.5% 0.216 257.160)` |
| Secondary | `--color-secondary` | `oklch(70% 0.213 47.604)`    |
| Accent    | `--color-accent`    | `oklch(62% 0.265 303.9)`     |
| Neutral   | `--color-neutral`   | `oklch(37% 0.013 285.805)`   |
| Info      | `--color-info`      | `oklch(78% 0.154 211.53)`    |
| Success   | `--color-success`   | `oklch(69% 0.17 162.48)`     |
| Warning   | `--color-warning`   | `oklch(85% 0.199 91.936)`    |
| Error     | `--color-error`     | `oklch(63% 0.237 25.331)`    |

**Semantic Color Rules**:

- **Success**: Member present, sync complete, validation passed
- **Warning**: Approaching deadline, pending approval, partial data
- **Error**: Member absent, sync failed, validation error
- **Info**: Informational badges, help text, secondary links
- **Neutral**: Default states, disabled controls, inactive items

## Typography

| Font        | Token          | Use Case                           |
| ----------- | -------------- | ---------------------------------- |
| DM Sans     | `font-display` | Headings h1-h2, hero text          |
| Roboto      | `font-sans`    | Body text, UI labels, descriptions |
| Roboto Mono | `font-mono`    | Code, data values, timestamps, IDs |
| Roboto Slab | `font-serif`   | Formal documents, certificates     |

## Component Selection

| Need               | Component  | Why                                 |
| ------------------ | ---------- | ----------------------------------- |
| Content container  | `AppCard`  | Semantic variants, status indicator |
| Status indicator   | `AppBadge` | Enforced semantic colors            |
| Tag/category label | `Chip`     | Decorative, clickable pills         |
| Data table         | `Table`    | Dense data display                  |

**Decision Tree**:

1. Showing status? → `AppBadge` (requires status prop)
2. Showing tag/category? → `Chip` (decorative allowed)
3. Content container with status? → `AppCard` with status prop
4. Simple content container? → `AppCard` default variant

## Spacing Scale

Use `--space-*` tokens from `tokens.css`:

- `--space-1` (4px): Inline spacing, icon gaps
- `--space-2` (8px): Tight component padding
- `--space-3` (12px): Default component padding
- `--space-4` (16px): Card padding, section gaps
- `--space-6` (24px): Large section spacing
- `--space-8` (32px): Page section dividers

## Anti-Patterns

**DO NOT**:

- Use semantic colors for decoration
- Create nested cards
- Use magic number spacing (use tokens)
- Add animations that delay user interaction
- Use white space that reduces information density
- Mix elevation levels within the same visual plane

**DO**:

- Use `AppBadge` for all status indicators
- Use `Chip` for decorative labels
- Use spacing tokens consistently
- Respect `prefers-reduced-motion`
- Prioritize information density
