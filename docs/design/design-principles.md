# Design Principles

Sentinel's visual language draws from naval operations centers: dense, professional, information-rich interfaces designed for operational clarity.

## Visual Philosophy

### Information Density Over White Space

- Maximize data visibility per viewport
- Compact layouts that respect operator attention
- Avoid decorative spacing that wastes screen real estate
- Tables and grids preferred over cards when displaying lists

### Restrained Animation

- Animation serves function, not decoration
- Status changes may pulse briefly to draw attention
- Page transitions use subtle fades (200-300ms)
- Hover states provide feedback without distraction
- `prefers-reduced-motion` disables all non-essential animation
- Use Motion (Framer Motion) for JavaScript-driven transitions (view transitions, AnimatePresence)
- CSS keyframes for simple entry animations; Motion for stateful/direction-aware transitions

### Professional Aesthetic

- Clean, utilitarian appearance
- No gradients except for subtle depth cues
- Icons are functional indicators, not decorations
- Typography prioritizes legibility over style

## Semantic Color System

Colors communicate meaning. Never use semantic colors for decoration.

| Status  | Use Case                                      | DaisyUI Token      |
| ------- | --------------------------------------------- | ------------------ |
| Success | Positive outcomes, present, active, healthy   | `success`          |
| Warning | Attention needed, pending, approaching limits | `warning`          |
| Error   | Failures, absent, critical issues             | `error`            |
| Info    | Neutral information, links, secondary actions | `info`             |
| Neutral | Default state, inactive, disabled             | `neutral`, `ghost` |

### Color Rules

- **Success**: Member present, sync complete, validation passed
- **Warning**: Approaching deadline, pending approval, partial data
- **Error**: Member absent, sync failed, validation error
- **Info**: Informational badges, help text, secondary links
- **Neutral**: Default states, disabled controls, inactive items

### Fadded Variants

Every semantic color has a **fadded** pair (`*-fadded` + `*-fadded-content`) for soft, low-emphasis backgrounds:

- Full color (`bg-success`): Buttons, badges, strong emphasis
- Fadded (`bg-success-fadded` + `text-success-fadded-content`): Banners, table row tinting, selected states, subtle highlights

### Extended Base Scale

Base colors extend beyond DaisyUI defaults with `base-400` and `base-500` for deeper surface hierarchy (disabled states, heavy borders, muted separators).

## Elevation Hierarchy

Visual depth indicates interactivity and importance.

| Level | Shadow Token | Use Case                            |
| ----- | ------------ | ----------------------------------- |
| 0     | `--shadow-0` | Inline elements, flat surfaces      |
| 1     | `--shadow-1` | Cards, dropdowns, default elevation |
| 2     | `--shadow-2` | Modals, popovers, elevated panels   |
| 3     | `--shadow-3` | Critical overlays, command dialogs  |

### Elevation Rules

- Higher elevation = more important/interactive
- Cards at rest use level 1
- Cards on hover may rise to level 2
- Modals always use level 2 or 3
- Never exceed level 3

## Typography Hierarchy

| Font        | Token          | Use Case                            |
| ----------- | -------------- | ----------------------------------- |
| DM Sans     | `font-display` | Headings, hero text, brand elements |
| Roboto      | `font-sans`    | Body text, UI labels, descriptions  |
| Roboto Mono | `font-mono`    | Code, data values, timestamps, IDs  |
| Roboto Slab | `font-serif`   | Formal documents, certificates      |

### Typography Rules

- Display font for headings h1-h2 only
- Sans font for all body content
- Mono font for any machine-readable data
- Never mix fonts within a single text block

## Spacing Philosophy

Consistent spacing creates visual rhythm without explicit measurement.

- Use the spacing scale (`--space-*`) for all margins and padding
- Prefer smaller spacing for dense data displays
- Larger spacing only for section separation
- Components define their own internal spacing via tokens

## Component Guidelines

### Cards (AppCard)

- Default for content containers
- Use `status` prop for semantic left border
- Use `variant` for visual style differentiation
- Never nest cards

### Badges (AppBadge)

- Require semantic status (no decorative badges)
- Use for state indication only
- Pulse animation for attention-requiring states
- Keep text brief (1-2 words)

### Chips

- Use for tags, categories, labels
- May use decorative colors
- Clickable when filtering
- Not for status indication

## Anti-Patterns

- Using color without semantic meaning
- Animations that delay user interaction
- White space that reduces information density
- Nested cards or excessive visual hierarchy
- Badges without clear status meaning
- Mixing elevation levels within the same visual plane
