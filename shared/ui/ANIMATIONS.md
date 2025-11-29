# Sentinel Animation Guide

This guide shows how to use micro-transitions in Sentinel components.

## Design Principles

1. **Subtle is better** - No bounce effects or flashy animations
2. **Functional over decorative** - Animations should aid comprehension
3. **GPU-accelerated** - Use transforms over position changes
4. **Accessible** - All animations disabled with `prefers-reduced-motion`

## Available Animation Classes

### Button Transitions

```tsx
// Standard button with hover lift
<button className="btn-transition px-4 py-2 bg-primary text-white rounded">
  Save Changes
</button>

// Subtle button (ghost buttons, icon buttons)
<button className="btn-subtle p-2 rounded">
  <IconTrash />
</button>
```

**Effects:**
- `.btn-transition` - Hover lift (translateY -1px), opacity 0.9 on active
- `.btn-subtle` - Minimal hover, opacity 0.7 on active

### Card Transitions

```tsx
// Interactive card with elevation
<div className="card-hover p-6 rounded-xl shadow-sm bg-white">
  <h3>Member Card</h3>
</div>

// Non-interactive card with subtle feedback
<div className="card-subtle p-6 rounded-xl shadow-sm bg-white">
  <StatsCard value={42} label="Present" />
</div>
```

**Effects:**
- `.card-hover` - Shadow elevation + translateY -2px on hover
- `.card-subtle` - Minimal shadow increase on hover

### Table Transitions

```tsx
// Applied automatically in DataTable component
<tr className="table-row-hover">
  <td>Data</td>
</tr>

<th className="table-header-hover">
  Sortable Header
</th>
```

**Effects:**
- `.table-row-hover` - Background color fade (150ms)
- `.table-header-hover` - Background color fade (150ms)

### Badge Transitions

```tsx
// Applied automatically in Badge component
<Badge variant="success" className="badge-appear">
  Active
</Badge>
```

**Effects:**
- `.badge-appear` - Scale + fade in animation

### Modal/Dialog Transitions

```tsx
// Modal overlay
<div className="modal-overlay fixed inset-0 bg-black/50">
  {/* Modal content */}
  <div className="modal-content bg-white rounded-lg p-6">
    <h2>Confirm Action</h2>
  </div>
</div>
```

**Effects:**
- `.modal-overlay` - Fade in (300ms)
- `.modal-content` - Scale + fade + translateY (300ms)

### Generic Utilities

```tsx
// Color transitions (backgrounds, text, borders)
<div className="transition-colors hover:bg-gray-100">
  Hover me
</div>

// Opacity fade
<div className="transition-opacity opacity-0 hover:opacity-100">
  Fade in
</div>

// Transform (scale, translate)
<div className="transition-transform hover:scale-105">
  Scale up
</div>

// Shadow elevation
<div className="transition-shadow hover:shadow-lg">
  Elevate
</div>

// Combined transitions
<div className="transition-all hover:bg-primary hover:shadow-lg">
  Multiple effects
</div>
```

### Loading States

```tsx
// Fade in content
<div className="fade-in">
  <p>Loaded content</p>
</div>

// Slide up (toasts, notifications)
<div className="slide-in-up">
  <Toast message="Success!" />
</div>
```

## Timing Guidelines

| Duration | Use Case | CSS Variable |
|----------|----------|--------------|
| 150ms | Micro interactions (hover, color) | `--sentinel-transition-micro` |
| 200ms | Small animations (badges, opacity) | `--sentinel-transition-small` |
| 300ms | Medium animations (modals) | `--sentinel-transition-medium` |
| 400ms | Large animations (page transitions) | `--sentinel-transition-large` |

## Easing Functions

| Easing | Use Case | CSS Variable |
|--------|----------|--------------|
| ease-out | Most transitions | `--sentinel-ease-out` |
| ease-in-out | Bidirectional animations | `--sentinel-ease-in-out` |

## Using TypeScript Tokens

Import transition tokens in React components:

```tsx
import { transitions } from '@sentinel/ui/tokens';

// Inline styles
const style = {
  transition: `opacity ${transitions.small} ${transitions.easeOut}`,
};

// Programmatic animations
const duration = parseInt(transitions.medium); // 300
```

## Accessibility

All animations are **automatically disabled** when the user has `prefers-reduced-motion` enabled. This is critical for:

- Users with vestibular disorders
- Raspberry Pi performance optimization
- Battery savings on mobile devices

Test with DevTools:
```
Chrome DevTools → Rendering → Emulate CSS media feature prefers-reduced-motion: reduce
```

## What NOT to Animate

❌ **Avoid animating layout-triggering properties:**
- `width`, `height` - Use `scale` instead
- `top`, `left`, `right`, `bottom` - Use `translate` instead
- `margin`, `padding` - Use transforms or opacity

❌ **Avoid excessive animations:**
- Bounce effects
- Spin/rotate on every interaction
- Delays longer than 500ms

## Examples

### Before/After Button

**Before (no transition):**
```tsx
<button className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-hover">
  Click me
</button>
```

**After (with transition):**
```tsx
<button className="btn-transition px-4 py-2 bg-primary text-white rounded hover:bg-primary-hover">
  Click me
</button>
```

### Before/After Card

**Before (no transition):**
```tsx
<div className="p-6 rounded-xl shadow-sm bg-white">
  <h3>Card Title</h3>
</div>
```

**After (with transition):**
```tsx
<div className="card-hover p-6 rounded-xl shadow-sm bg-white cursor-pointer">
  <h3>Card Title</h3>
</div>
```

## Testing Checklist

- [ ] Hover states transition smoothly (no jank)
- [ ] Active states provide immediate feedback
- [ ] Focus states are visible and transition cleanly
- [ ] Animations disabled with `prefers-reduced-motion: reduce`
- [ ] No layout shifts during animations
- [ ] Performance is smooth on Raspberry Pi (test on actual hardware)
