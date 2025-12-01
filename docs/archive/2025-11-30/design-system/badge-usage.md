# Badge Usage Guide

## Overview

The Badge component provides consistent, accessible status indicators across all Sentinel interfaces. All badge variants meet WCAG AA accessibility standards (4.5:1 minimum contrast ratio).

## Import

```tsx
import { Badge } from '@sentinel/ui';
```

## Semantic Variants

### Attendance Status

**`present`** - Member has checked in (green)
- Use for: Active presence, checked-in members
- Color: Green (#dcfce7 background, #166534 text)
- Icon: CheckCircle

```tsx
<Badge variant="present">Checked In</Badge>
<Badge variant="present">Present</Badge>
```

**`absent`** - Member has not checked in (red)
- Use for: Members who haven't checked in, no-shows
- Color: Red (#fee2e2 background, #991b1b text)
- Icon: XCircle

```tsx
<Badge variant="absent">Absent</Badge>
<Badge variant="absent">Not Present</Badge>
```

**`excused`** - Excused absence (gray)
- Use for: Pre-approved absences, leave
- Color: Gray (#f3f4f6 background, #374151 text)
- Icon: HelpCircle

```tsx
<Badge variant="excused">Excused</Badge>
<Badge variant="excused">On Leave</Badge>
```

### Visitor Types

**`visitor`** - General visitor (blue)
- Use for: External visitors, guests
- Color: Blue (#dbeafe background, #1e40af text)
- Icon: DoorOpen

```tsx
<Badge variant="visitor">Visitor</Badge>
<Badge variant="visitor">Guest</Badge>
```

### Member Status

**`active`** - Active member (green)
- Use for: Active roster members, enabled accounts
- Color: Green (#dcfce7 background, #166534 text)
- Icon: Check

```tsx
<Badge variant="active">Active</Badge>
<Badge variant="active">Enabled</Badge>
```

**`inactive`** - Inactive/disabled (gray)
- Use for: Inactive roster members, disabled accounts
- Color: Gray (#f3f4f6 background, #475569 text)
- Icon: X

```tsx
<Badge variant="inactive">Inactive</Badge>
<Badge variant="inactive">Disabled</Badge>
```

### Event/Item Status

**`draft`** - Work in progress (amber)
- Use for: Draft events, unpublished content
- Color: Amber (#fef3c7 background, #92400e text)
- Icon: Edit

```tsx
<Badge variant="draft">Draft</Badge>
<Badge variant="draft">Unpublished</Badge>
```

**`pending`** - Awaiting action (amber)
- Use for: Items requiring approval, pending actions
- Color: Amber (#fef3c7 background, #92400e text)
- Icon: Clock

```tsx
<Badge variant="pending">Pending</Badge>
<Badge variant="pending">Awaiting Approval</Badge>
```

### General Feedback

**`success`** - Positive outcome (green)
- Use for: Successful operations, confirmations
- Color: Green (#dcfce7 background, #166534 text)
- Icon: CheckCircle

```tsx
<Badge variant="success">Success</Badge>
<Badge variant="success">Completed</Badge>
```

**`warning`** - Needs attention (amber)
- Use for: Warnings, items requiring attention
- Color: Amber (#fef3c7 background, #92400e text)
- Icon: AlertTriangle

```tsx
<Badge variant="warning">Warning</Badge>
<Badge variant="warning">Attention Required</Badge>
```

**`error`** - Problem/failure (red)
- Use for: Errors, failed operations
- Color: Red (#fee2e2 background, #991b1b text)
- Icon: AlertCircle

```tsx
<Badge variant="error">Error</Badge>
<Badge variant="error">Failed</Badge>
```

**`info`** - Informational (blue)
- Use for: Informational messages, tips
- Color: Blue (#dbeafe background, #1e40af text)
- Icon: Info

```tsx
<Badge variant="info">Info</Badge>
<Badge variant="info">Notice</Badge>
```

**`neutral`** - No specific meaning (gray)
- Use for: Generic labels, unclassified states
- Color: Gray (#f3f4f6 background, #374151 text)
- Icon: HelpCircle

```tsx
<Badge variant="neutral">Default</Badge>
<Badge variant="neutral">Other</Badge>
```

## Sizes

Three sizes available: `sm`, `md` (default), `lg`

```tsx
<Badge variant="present" size="sm">Small</Badge>
<Badge variant="present" size="md">Medium</Badge>
<Badge variant="present" size="lg">Large</Badge>
```

## Custom Icons

Override the default icon for a variant:

```tsx
import { Building } from '@sentinel/ui/icons';

<Badge variant="visitor" icon={Building}>Official Visit</Badge>
```

## Usage Examples

### Activity Feed
```tsx
// Dashboard recent activity
<Badge variant="success">Checked In</Badge>
<Badge variant="warning">Checked Out</Badge>
<Badge variant="info">Visitor</Badge>
```

### Member Tables
```tsx
// Member status column
<Badge variant="active">Active</Badge>
<Badge variant="inactive">Inactive</Badge>

// Attendance status
<Badge variant="present">Present</Badge>
<Badge variant="absent">Absent</Badge>
```

### Event Status
```tsx
// Event listing
<Badge variant="draft">Draft</Badge>
<Badge variant="success">Active</Badge>
<Badge variant="neutral">Completed</Badge>
<Badge variant="error">Cancelled</Badge>
```

### Visitor Types
```tsx
// Visitor table
<Badge variant="visitor">contractor</Badge>
<Badge variant="visitor">recruitment</Badge>
<Badge variant="visitor">official</Badge>
```

## Accessibility

The Badge component follows WCAG AA guidelines:

- **Icons are decorative**: Icons have `aria-hidden="true"` and don't convey meaning
- **Text provides meaning**: Screen readers announce the text content only
- **Status role**: Badges have `role="status"` for screen reader announcements
- **High contrast**: All color combinations meet 4.5:1 minimum contrast ratio
- **No color-only meaning**: Icons and text provide redundant meaning

## Anti-Patterns

### ❌ Don't use inline styles
```tsx
// Bad - inconsistent styling
<span className="bg-green-100 text-green-800 px-2 py-1 rounded">Active</span>
```

### ❌ Don't use HeroUI Chip for status
```tsx
// Bad - replace with Badge component
<Chip color="success">Active</Chip>
```

### ✅ Do use Badge component
```tsx
// Good - consistent, accessible
<Badge variant="active">Active</Badge>
```

### ❌ Don't rely on color alone
```tsx
// Bad - no visual indicator besides color
<Badge variant="error">Status</Badge>
```

### ✅ Do provide clear text
```tsx
// Good - descriptive text
<Badge variant="error">Failed</Badge>
<Badge variant="error">Error: Connection Lost</Badge>
```

## Related Components

- **StatsCard** - For dashboard metrics with icons
- **Table** - For tabular data display
- **Chip** - For user-generated tags and filters (use Badge for status)

## Color Reference

All badge colors are defined in `shared/ui/tokens.ts`:

- `badgeColors` - Attendance/member-specific states
- `statusColors` - General feedback states (success, warning, error, info, neutral)

Colors are centrally managed and automatically applied by the Badge component.
