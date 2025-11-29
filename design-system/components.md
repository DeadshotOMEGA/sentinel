# Component Specifications

## Buttons

### Sizes
| Class | Height | Min Touch Target |
|-------|--------|------------------|
| `.btn-sm` | 32px | Desktop only |
| `.btn-md` | 40px | Desktop default |
| `.btn-lg` | 48px | Meets 48px WCAG |
| `.btn-xl` | 56px | Kiosk default |

### Variants
| Class | Background | Border | Text |
|-------|------------|--------|------|
| `.btn-primary` | `--color-primary` | Same | White |
| `.btn-secondary` | Transparent | `--color-primary` | Primary |
| `.btn-ghost` | Transparent | None | `--color-neutral-700` |
| `.btn-accent` | `--color-accent` | Same | White |
| `.btn-danger` | `--color-error` | Same | White |
| `.btn-success` | `--color-success` | Same | White |

### States
- `:hover` - Darker background (`-hover` variant)
- `:active` - `transform: scale(0.98)`
- `:disabled` - `opacity: 0.5`, no pointer events
- `:focus-visible` - 3px box-shadow ring

### Icon Buttons
Use `.btn-icon` with size class. Aspect ratio 1:1.

---

## Form Inputs

### Text Input
| Class | Height | Font Size |
|-------|--------|-----------|
| `.input` | 40px | 1rem |
| `.input-sm` | 32px | 0.875rem |
| `.input-lg` | 48px | 1.125rem |
| `.input-xl` | 56px | 1.125rem (kiosk) |

### States
- Default border: `--color-neutral-300`
- Hover: `--color-neutral-400`
- Focus: Primary border + 3px ring
- Error: `.input-error` - red border/ring
- Disabled: Gray background, no interaction

### Textarea
Height: 120px minimum, resizable vertical.

### Select
Same sizing as input. Custom chevron icon via background-image.

### Checkbox
- Size: 20x20px
- Checked: Primary fill with white checkmark
- Focus: 3px primary ring

### Radio
- Size: 20x20px
- Checked: Primary border with filled center dot

### Toggle Switch
- Size: 48x24px
- Track: `--color-neutral-300` (off), `--color-primary` (on)
- Knob: 20px white circle with shadow

---

## Cards

### Base Card
```css
.card {
  background: white;
  border-radius: --radius-lg;
  box-shadow: --shadow-md;
}
```

### Structure
- `.card-header` - Border bottom, padding lg
- `.card-body` - Padding lg
- `.card-footer` - Gray background, padding md/lg

### Employee Card
Horizontal layout: avatar + info. Border highlights on hover.

### Metric Card
Large stat display:
- `.metric-label` - Uppercase caption
- `.metric-value` - Display size, bold
- `.metric-trend` - Small trend indicator

### TV Card
Enlarged for wall display. 5rem stat values.

### Alert Card
Left border 4px colored by severity.

---

## Tables

### Structure
```html
<div class="table-wrapper">
  <table class="table">
    <thead>...</thead>
    <tbody>...</tbody>
  </table>
</div>
```

### Styling
- Header: Gray background, semibold, uppercase
- Cells: Padding md, bottom border
- Hover: Subtle gray background

### Compact Mode
`.table-compact` - Reduced padding (sm/md)

### Pagination
Below table: info text + number buttons + prev/next.

---

## Status Indicators

### Status Dot
| Class | Color | Usage |
|-------|-------|-------|
| `.status-dot-online` | Success green | Present |
| `.status-dot-offline` | Neutral gray | Absent |
| `.status-dot-away` | Warning yellow | Away |
| `.status-dot-busy` | Error red | Busy |

Add `.status-dot-pulse` for animated ring.

### Badges
Pill-shaped labels:
- `.badge-primary` - Blue
- `.badge-success` - Green
- `.badge-warning` - Amber
- `.badge-error` - Red
- `.badge-neutral` - Gray
- `.badge-accent` - Orange

### Counter Badge
`.badge-count` - Red circle for notifications. Min width 20px.

### Connection Status
Pills showing online/offline/syncing state with dot and label.

### Spinner
`.spinner` - 16px rotating border animation.
Sizes: `-sm` (12px), `-lg` (24px), `-xl` (40px)

### Progress Bar
8px height track with animated fill.

---

## Alerts & Feedback

### Alert Banner
Full-width box with icon, content, dismiss button.
| Class | Background |
|-------|------------|
| `.alert-info` | Info light |
| `.alert-success` | Success light |
| `.alert-warning` | Warning light |
| `.alert-error` | Error light |

### Toast
Fixed position top-right. Slide-in animation.
- Left border indicates severity
- Auto-dismiss after timeout
- Max width 480px

### Modal
Centered overlay with backdrop blur.
- `.modal-header` - Title + close button
- `.modal-body` - Scrollable content
- `.modal-footer` - Action buttons, gray background

### Confirmation Dialog
Centered icon + text + action buttons.

---

## Navigation

### Sidebar
Fixed left, 240px wide. Contains:
- Logo/brand header
- Section groups with nav items
- User avatar at bottom

### Nav Item
Horizontal: icon + label. States:
- Default: Neutral text
- Hover: Gray background
- Active: Primary background/text

### Tabs
Horizontal tab bar with underline indicator.

### Breadcrumbs
Path items separated by chevrons.

---

## Data Display

### Activity Feed
Vertical list with indicator dots, content, timestamps.

### Check-in Feed
Scrollable list with slide-in animation for new items.

### Empty State
Centered: icon + title + description + optional action.

### Skeleton Loading
Shimmer animation placeholder for loading content.
