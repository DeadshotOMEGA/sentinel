# Style Guide

Concrete visual rules for Sentinel frontend development.

## Spacing Scale

| Token        | Value | Use Case                   |
| ------------ | ----- | -------------------------- |
| `--space-1`  | 4px   | Inline spacing, icon gaps  |
| `--space-2`  | 8px   | Tight component padding    |
| `--space-3`  | 12px  | Default component padding  |
| `--space-4`  | 16px  | Card padding, section gaps |
| `--space-5`  | 20px  | Medium section spacing     |
| `--space-6`  | 24px  | Large section spacing      |
| `--space-8`  | 32px  | Page section dividers      |
| `--space-10` | 40px  | Major layout gaps          |
| `--space-12` | 48px  | Page-level spacing         |

### Common Patterns

```css
/* Card internal padding */
padding: var(--space-4);

/* Stack gap between cards */
gap: var(--space-3);

/* Section separation */
margin-top: var(--space-8);
```

## Component Selection Matrix

| Need                   | Component  | Why                                 |
| ---------------------- | ---------- | ----------------------------------- |
| Content container      | `AppCard`  | Semantic variants, status indicator |
| Low-level card control | `Card`     | Direct DaisyUI access               |
| Status indicator       | `AppBadge` | Enforced semantic colors            |
| Generic badge          | `Badge`    | Low-level DaisyUI badge             |
| Tag/category label     | `Chip`     | Decorative, clickable pills         |
| Data table             | `Table`    | Dense data display                  |

### Decision Tree

1. **Showing status?** → `AppBadge` (requires status prop)
2. **Showing tag/category?** → `Chip` (decorative allowed)
3. **Generic badge needed?** → `Badge` (low-level)
4. **Content container with status?** → `AppCard` with status prop
5. **Simple content container?** → `AppCard` default variant
6. **Need low-level card control?** → `Card` directly

## Color Usage Rules

### Base Colors

Extended base scale for surface hierarchy:

| Class         | Use Case                              |
| ------------- | ------------------------------------- |
| `bg-base-100` | Primary background (white)            |
| `bg-base-200` | Subtle background, card surfaces      |
| `bg-base-300` | Borders, dividers, input backgrounds  |
| `bg-base-400` | Disabled backgrounds, heavier borders |
| `bg-base-500` | Muted elements, separator lines       |

### Semantic Colors (Status-Only)

```tsx
// CORRECT: Status indication
<AppBadge status="success">Present</AppBadge>
<AppCard status="warning">...</AppCard>

// INCORRECT: Decorative use
<div className="bg-success">...</div>  // Don't use for decoration
```

### Fadded Variants (Soft Backgrounds)

Use fadded colors for subtle, low-emphasis status backgrounds. Every semantic color has a `-fadded` and `-fadded-content` pair:

```tsx
// CORRECT: Soft status background
<div className="bg-success-fadded text-success-fadded-content p-3 rounded-lg">
  All systems operational
</div>

// CORRECT: Warning banner
<div className="bg-warning-fadded text-warning-fadded-content p-2">
  Approaching deadline
</div>

// CORRECT: Selected/active row
<tr className="bg-primary-fadded text-primary-fadded-content">...</tr>

// INCORRECT: Mixing fadded bg with non-fadded content text
<div className="bg-success-fadded text-success">...</div>  // Use fadded-content
```

**When to use**:

- Full color (`bg-primary`): Buttons, badges, strong emphasis
- Fadded (`bg-primary-fadded`): Backgrounds, banners, subtle highlights, table tinting, selected states

### Brand/Decorative Colors

```tsx
// Use Chip for decorative/categorical colors
<Chip color="blue">Engineering</Chip>
<Chip color="purple">Admin</Chip>

// Use DaisyUI base colors for backgrounds
<div className="bg-base-200">...</div>
```

## Component Patterns

### AppCard with Status

```tsx
<AppCard status="success" variant="elevated">
  <AppCardHeader>
    <AppCardTitle>Member Status</AppCardTitle>
  </AppCardHeader>
  <AppCardContent>Content here</AppCardContent>
</AppCard>
```

### AppCard Variants

| Variant    | Class Applied    | Use Case                      |
| ---------- | ---------------- | ----------------------------- |
| `default`  | Base card        | Standard containers           |
| `elevated` | `.card-elevated` | Important content, hover lift |
| `panel`    | `.stats-panel`   | Statistics displays           |
| `stats`    | `.stats-panel`   | Alias for panel               |

### AppBadge with Pulse

```tsx
// Attention-requiring status
<AppBadge status="warning" pulse>Action Required</AppBadge>

// Standard status
<AppBadge status="success">Active</AppBadge>
```

### AppBadge Sizes

| Size | Use Case                      |
| ---- | ----------------------------- |
| `sm` | Inline with text, table cells |
| `md` | Default, standalone badges    |
| `lg` | Hero stats, prominent status  |

## Z-Index Scale

| Token          | Value | Use Case                  |
| -------------- | ----- | ------------------------- |
| `--z-base`     | 0     | Default stacking          |
| `--z-dropdown` | 10    | Dropdowns, selects        |
| `--z-sticky`   | 20    | Sticky headers            |
| `--z-modal`    | 30    | Modal overlays            |
| `--z-popover`  | 40    | Popovers, tooltips        |
| `--z-tooltip`  | 50    | Highest priority overlays |

## Transition Durations

| Token               | Value | Use Case                   |
| ------------------- | ----- | -------------------------- |
| `--duration-fast`   | 150ms | Micro-interactions, hovers |
| `--duration-normal` | 200ms | Standard transitions       |
| `--duration-slow`   | 300ms | Page transitions, modals   |

### Motion Library Mapping

| Token               | CSS Value | Motion Config        |
| ------------------- | --------- | -------------------- |
| `--duration-fast`   | 150ms     | `{ duration: 0.15 }` |
| `--duration-normal` | 200ms     | `{ duration: 0.2 }`  |
| `--duration-slow`   | 300ms     | `{ duration: 0.3 }`  |

Use `AnimatePresence mode="wait"` for page-level transitions. Use CSS keyframes for simpler entry animations.

## Anti-Patterns

### DO NOT

```tsx
// Using any type
const status: any = 'success';  // Use proper types

// Semantic color for decoration
<div className="bg-error">Header</div>  // Use base colors

// Badge without status meaning
<Badge>New</Badge>  // Use Chip for decorative

// Nested cards
<AppCard>
  <AppCard>...</AppCard>  // Never nest cards
</AppCard>

// Magic number spacing
<div className="p-3.25">  // Use spacing tokens

// Hardcoded z-index
<div className="z-999">  // Use z-index tokens
```

### DO

```tsx
// Proper typing
const status: AppBadgeStatus = 'success';

// Base colors for backgrounds
<div className="bg-base-200">Header</div>

// Chip for decorative labels
<Chip color="blue">New Feature</Chip>

// Flat card structure
<AppCard>...</AppCard>

// Token-based spacing
<div style={{ padding: 'var(--space-3)' }}>

// Token-based z-index
<div style={{ zIndex: 'var(--z-modal)' }}>
```

## Review Checklist

When reviewing components, verify:

- [ ] No `any` types used
- [ ] Status indicators use `AppBadge`
- [ ] Decorative labels use `Chip`
- [ ] Cards use `AppCard` (not nested)
- [ ] Semantic colors only for status
- [ ] Spacing uses tokens (no magic numbers)
- [ ] Z-index uses tokens
- [ ] Transitions use duration tokens
- [ ] Animations respect `prefers-reduced-motion`
