# Sentinel Shared UI Library

**@sentinel/ui** - Centralized design system for all Sentinel applications (frontend, kiosk, tv-display)

## Purpose

This package provides:
- **HeroUI theme configuration** with Sentinel brand colors (8 semantic colors with full 50-950 scales)
- **Shared React components** used across multiple apps
- **Utility functions** for UI patterns (chip variants, tag colors, rank sorting, activity feed, log formatting)
- **Design tokens** accessible via TypeScript, Tailwind CSS, and CSS variables
- **Custom hooks** for common UI behaviors

## Directory Structure

```
shared/ui/
├── theme/              # Theme configuration (canonical - purple secondary)
│   └── index.ts        # HeroUI theme with 8 semantic colors
├── components/         # Shared React components
│   ├── tooltips/       # Tooltip variants (IconTooltip, StatusTooltip, TruncatedText)
│   └── *.tsx           # All other components
├── hooks/              # React hooks (useDebounce, useIsOverflowing)
├── utils/              # Utility functions (UI-specific, in shared/utils/)
├── tokens.ts           # Utility design tokens (layout, fonts, typography)
├── hero.ts             # HeroUI Tailwind v4 plugin configuration
├── index.ts            # Main exports
├── theme.css           # Generated CSS custom properties
├── animations.css      # Animation keyframes
└── typography.css      # Typography styles
```

---

## Import Patterns

### TypeScript/React Imports

All components, hooks, and utilities are exported from `@sentinel/ui`:

```tsx
// Components
import {
  Button,
  Card,
  Table,
  Badge,
  ActivityPanel,
  LogViewer,
  BadgeChip,
  Clock,
  PresenceCards
} from '@sentinel/ui';

// Tooltips
import { IconTooltip, StatusTooltip, TruncatedText } from '@sentinel/ui';

// Hooks
import { useDebounce, useIsOverflowing } from '@sentinel/ui';

// Theme
import { designTokens, sentinelTheme, cssVariables } from '@sentinel/ui';

// Utilities
import {
  sortMembersByRank,
  getTagColor,
  getMemberStatusChipVariant,
  filterActivityItems,
  getLogLevelColor
} from '@sentinel/ui';
```

### Tailwind CSS Imports

In your app's main CSS file:

```css
@import "@sentinel/ui/theme.css";
@import "@sentinel/ui/animations.css";
@import "@sentinel/ui/typography.css";
```

### Tailwind v4 Plugin

In your app's CSS file (Tailwind v4):

```css
@plugin '../shared/ui/hero.ts';
```

Or for Tailwind v3, in `tailwind.config.ts`:

```typescript
import { sentinelTheme, tailwindExtend } from '../shared/ui/theme';
import { heroui } from '@heroui/react';

export default {
  content: ['../shared/ui/**/*.tsx'],
  theme: {
    extend: tailwindExtend,
  },
  plugins: [heroui(sentinelTheme)],
};
```

---

## Theme Architecture

### 8 Semantic Colors

Sentinel uses **8 semantic colors** with full 50-950 shade scales. Each color has a **DEFAULT shade at 600** for WCAG AA compliance (4.5:1 minimum contrast ratio).

| Color | DEFAULT (600 shade) | Usage | Foreground |
|-------|---------------------|-------|------------|
| **Primary** | `#205bcf` (Blue) | Brand primary, CTAs, links | `#ffffff` |
| **Secondary** | `#9a18b3` (Purple) | **Canonical user-required color** | `#ffffff` |
| **Success** | `#037a36` (Green) | Success states, active status | `#ffffff` |
| **Warning** | `#a16603` (Orange) | Warning states, pending | `#ffffff` |
| **Danger** | `#be041e` (Red) | Error states, inactive status | `#ffffff` |
| **Gray** | `#656565` (Neutral) | Neutral states, disabled | `#ffffff` |
| **Info** | `#01f378` (Bright Teal) | Informational states | `#000000` |
| **Accent** | `#97436e` (Magenta) | Accent elements, highlights | `#ffffff` |

### Full Color Scales

Each color has 11 shades (50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950) with WCAG contrast annotations.

#### Primary - Blue

| Shade | Hex | Contrast on White | WCAG Level |
|-------|-----|-------------------|------------|
| 50 | `#e8f1fc` | 1.05:1 | ❌ Fail |
| 100 | `#c7dcf8` | 1.19:1 | ❌ Fail |
| 200 | `#a3c7f4` | 1.42:1 | ❌ Fail |
| 300 | `#7eb1f0` | 1.77:1 | ❌ Fail |
| 400 | `#5a9cec` | 2.29:1 | ❌ Fail |
| 500 | `#3687e8` | 3.05:1 | ❌ Fail (AA Large only: 3:1) |
| **600** | `#205bcf` | **4.52:1** | ✅ **AA** |
| 700 | `#1a4aa8` | 6.38:1 | ✅ AAA |
| 800 | `#143a82` | 8.89:1 | ✅ AAA |
| 900 | `#0e295c` | 12.13:1 | ✅ AAA |
| 950 | `#081936` | 15.67:1 | ✅ AAA |

#### Secondary - Purple (Canonical)

| Shade | Hex | Contrast on White | WCAG Level |
|-------|-----|-------------------|------------|
| 50 | `#f5e8f8` | 1.03:1 | ❌ Fail |
| 100 | `#e6c8ef` | 1.12:1 | ❌ Fail |
| 200 | `#d6a7e5` | 1.28:1 | ❌ Fail |
| 300 | `#c686db` | 1.53:1 | ❌ Fail |
| 400 | `#b665d1` | 1.91:1 | ❌ Fail |
| 500 | `#a644c7` | 2.49:1 | ❌ Fail |
| **600** | `#9a18b3` | **4.51:1** | ✅ **AA** |
| 700 | `#7c1391` | 6.72:1 | ✅ AAA |
| 800 | `#5e0f6e` | 10.15:1 | ✅ AAA |
| 900 | `#400a4c` | 14.28:1 | ✅ AAA |
| 950 | `#22052a` | 18.42:1 | ✅ AAA |

> **Note:** Secondary purple (#9a18b3) is the canonical user-required color.

#### Success - Green

| Shade | Hex | Contrast on White | WCAG Level |
|-------|-----|-------------------|------------|
| 50 | `#e6f5ec` | 1.02:1 | ❌ Fail |
| 100 | `#c2e7d0` | 1.09:1 | ❌ Fail |
| 200 | `#9bd8b3` | 1.23:1 | ❌ Fail |
| 300 | `#74c996` | 1.46:1 | ❌ Fail |
| 400 | `#4dba79` | 1.82:1 | ❌ Fail |
| 500 | `#26ab5c` | 2.41:1 | ❌ Fail |
| **600** | `#037a36` | **4.52:1** | ✅ **AA** |
| 700 | `#02622b` | 6.89:1 | ✅ AAA |
| 800 | `#024a20` | 10.34:1 | ✅ AAA |
| 900 | `#013216` | 14.56:1 | ✅ AAA |
| 950 | `#001a0b` | 18.89:1 | ✅ AAA |

#### Warning - Orange

| Shade | Hex | Contrast on White | WCAG Level |
|-------|-----|-------------------|------------|
| 50 | `#fef6e6` | 1.01:1 | ❌ Fail |
| 100 | `#fce9c2` | 1.06:1 | ❌ Fail |
| 200 | `#fadb9b` | 1.16:1 | ❌ Fail |
| 300 | `#f8cd74` | 1.32:1 | ❌ Fail |
| 400 | `#f6bf4d` | 1.56:1 | ❌ Fail |
| 500 | `#f4b126` | 1.92:1 | ❌ Fail |
| **600** | `#a16603` | **4.89:1** | ✅ **AA** |
| 700 | `#825203` | 6.78:1 | ✅ AAA |
| 800 | `#633e02` | 9.45:1 | ✅ AAA |
| 900 | `#442a01` | 13.12:1 | ✅ AAA |
| 950 | `#251701` | 17.23:1 | ✅ AAA |

#### Danger - Red

| Shade | Hex | Contrast on White | WCAG Level |
|-------|-----|-------------------|------------|
| 50 | `#fde8ea` | 1.02:1 | ❌ Fail |
| 100 | `#f9c6cb` | 1.11:1 | ❌ Fail |
| 200 | `#f5a3ab` | 1.28:1 | ❌ Fail |
| 300 | `#f1808c` | 1.54:1 | ❌ Fail |
| 400 | `#ed5d6c` | 1.95:1 | ❌ Fail |
| 500 | `#e93a4d` | 2.67:1 | ❌ Fail |
| **600** | `#be041e` | **6.12:1** | ✅ **AAA** |
| 700 | `#980318` | 8.34:1 | ✅ AAA |
| 800 | `#720212` | 11.89:1 | ✅ AAA |
| 900 | `#4c020c` | 16.45:1 | ✅ AAA |
| 950 | `#260106` | 19.78:1 | ✅ AAA |

#### Gray - Neutral

| Shade | Hex | Contrast on White | WCAG Level |
|-------|-----|-------------------|------------|
| 50 | `#f5f5f5` | 1.03:1 | ❌ Fail |
| 100 | `#e5e5e5` | 1.12:1 | ❌ Fail |
| 200 | `#d4d4d4` | 1.26:1 | ❌ Fail |
| 300 | `#c4c4c4` | 1.45:1 | ❌ Fail |
| 400 | `#a3a3a3` | 1.95:1 | ❌ Fail |
| 500 | `#838383` | 2.78:1 | ❌ Fail |
| **600** | `#656565` | **4.54:1** | ✅ **AA** |
| 700 | `#525252` | 6.23:1 | ✅ AAA |
| 800 | `#3f3f3f` | 8.89:1 | ✅ AAA |
| 900 | `#2b2b2b` | 12.67:1 | ✅ AAA |
| 950 | `#171717` | 16.89:1 | ✅ AAA |

#### Info - Bright Teal

| Shade | Hex | Contrast on White | WCAG Level | Foreground |
|-------|-----|-------------------|------------|------------|
| 50 | `#e6fef5` | 1.01:1 | ❌ Fail | `#000000` |
| 100 | `#c2fce7` | 1.03:1 | ❌ Fail | `#000000` |
| 200 | `#9bfad8` | 1.07:1 | ❌ Fail | `#000000` |
| 300 | `#74f8c9` | 1.13:1 | ❌ Fail | `#000000` |
| 400 | `#4df6ba` | 1.21:1 | ❌ Fail | `#000000` |
| 500 | `#26f4ab` | 1.32:1 | ❌ Fail | `#000000` |
| **600** | `#01f378` | **1.57:1** | ❌ **Use with black foreground** | `#000000` |
| 700 | `#01c260` | 2.89:1 | ❌ Fail | `#000000` |
| 800 | `#019248` | 4.67:1 | ✅ AA | `#ffffff` |
| 900 | `#006130` | 7.89:1 | ✅ AAA | `#ffffff` |
| 950 | `#003118` | 13.45:1 | ✅ AAA | `#ffffff` |

> **Note:** Info color (#01f378) is very bright - always use with **black foreground** (`#000000`) for readability.

#### Accent - Magenta

| Shade | Hex | Contrast on White | WCAG Level |
|-------|-----|-------------------|------------|
| 50 | `#f8e9ef` | 1.02:1 | ❌ Fail |
| 100 | `#eec9d8` | 1.09:1 | ❌ Fail |
| 200 | `#e3a8c0` | 1.22:1 | ❌ Fail |
| 300 | `#d988a8` | 1.42:1 | ❌ Fail |
| 400 | `#ce6791` | 1.73:1 | ❌ Fail |
| 500 | `#c44779` | 2.21:1 | ❌ Fail |
| **600** | `#97436e` | **4.68:1** | ✅ **AA** |
| 700 | `#793658` | 6.89:1 | ✅ AAA |
| 800 | `#5b2942` | 10.12:1 | ✅ AAA |
| 900 | `#3d1c2c` | 14.34:1 | ✅ AAA |
| 950 | `#1f0e16` | 18.12:1 | ✅ AAA |

### Layout Tokens

```typescript
layout: {
  dividerWeight: "1px",
  disabledOpacity: 0.5,
  radius: {
    small: "8px",
    medium: "12px",
    large: "14px",
  },
  borderWidth: {
    small: "1px",
    medium: "2px",
    large: "3px",
  },
  fontSize: {
    tiny: "0.75rem",    // 12px
    small: "0.875rem",  // 14px
    medium: "1rem",     // 16px
    large: "1.125rem",  // 18px
  },
  lineHeight: {
    tiny: "1rem",
    small: "1.25rem",
    medium: "1.5rem",
    large: "1.75rem",
  },
  boxShadow: {
    small: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    medium: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    large: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  },
}
```

### Typography

```typescript
fonts: {
  sans: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
}
```

### Light and Dark Themes

Both light and dark themes are included with inverted color scales for dark mode. The DEFAULT (600 shade) remains the same across both themes to maintain WCAG AA compliance.

---

## Component Customization

HeroUI provides three main approaches for styling components:

### 1. Direct className (Simple Overrides)

For quick, one-off styling:

```tsx
import { Button } from '@sentinel/ui';

<Button className="font-bold uppercase">
  Click Me
</Button>
```

### 2. extendVariants (Reusable Variants)

For creating custom variants that can be reused across your app:

```tsx
import { extendVariants, Chip } from '@heroui/react';

// Create custom chip with status variants
export const StatusChip = extendVariants(Chip, {
  variants: {
    status: {
      active: {
        base: 'bg-success/20 border-success',
        dot: 'bg-success',
        content: 'text-success-600 dark:text-success-400',
      },
      disabled: {
        base: 'bg-danger/20 border-danger',
        dot: 'bg-danger',
        content: 'text-danger-600 dark:text-danger-400',
      },
    },
  },
  defaultVariants: {
    size: 'sm',
    variant: 'dot',
  },
});

// Usage
<StatusChip status="active">Active</StatusChip>
```

### 3. Slot-based Styling (Multi-part Components)

For complex components with multiple internal elements (slots):

```tsx
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@sentinel/ui';

<Table
  classNames={{
    base: '-mx-1 -my-1 flex-1 overflow-hidden px-1 py-1',  // Shadow breathing room
    wrapper: 'max-h-full overflow-auto',
    th: 'bg-default-100 text-default-700 font-semibold',
    td: 'py-3',
  }}
>
  {/* ... */}
</Table>
```

**HeroUI Component Slots**: Most HeroUI components expose multiple slots. Common slots include:
- `base` - Root element
- `wrapper` - Inner wrapper
- `content` - Content area
- `label` - Label text
- `description` - Description text
- `input` - Input field (for form components)
- `trigger` - Trigger element (for overlays)

See [HeroUI documentation](https://heroui.com) for component-specific slot names.

---

## CSS Variables Reference

### Semantic Color Variables

All semantic colors are available as CSS custom properties:

```css
/* Color defaults (600 shade) */
--heroui-primary: #205bcf;
--heroui-secondary: #9a18b3;
--heroui-success: #037a36;
--heroui-warning: #a16603;
--heroui-danger: #be041e;
--heroui-gray: #656565;
--heroui-info: #01f378;
--heroui-accent: #97436e;

/* Color shades (50-950) */
--heroui-primary-50: #e8f1fc;
--heroui-primary-100: #c7dcf8;
/* ... all shades ... */
--heroui-primary-950: #081936;

/* Foreground colors */
--heroui-primary-foreground: #ffffff;
--heroui-secondary-foreground: #ffffff;
--heroui-info-foreground: #000000;  /* Black for bright teal */

/* Sentinel-specific aliases */
--sentinel-primary: #205bcf;
--sentinel-secondary: #9a18b3;
--sentinel-teal: #01f378;
--sentinel-magenta: #97436e;
```

### Layout Token Variables

```css
--sentinel-radius-sm: 8px;
--sentinel-radius-md: 12px;
--sentinel-radius-lg: 14px;

--sentinel-shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--sentinel-shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--sentinel-shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);

--sentinel-font-sans: 'Inter', system-ui, sans-serif;
--sentinel-font-mono: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
```

### Using CSS Variables

**In Tailwind CSS:**

```tsx
<div className="text-[var(--heroui-primary)]">
  Primary text
</div>

<Button className="bg-[var(--sentinel-secondary)]">
  Secondary button
</Button>
```

**In Raw CSS:**

```css
.my-component {
  color: var(--heroui-primary);
  background: var(--heroui-secondary-50);
  border-radius: var(--sentinel-radius-md);
  box-shadow: var(--sentinel-shadow-md);
}
```

---

## Components

### Display Components

| Component | Description | File |
|-----------|-------------|------|
| `Badge` | Badge status indicator (not to be confused with HeroUI's Badge) | `components/Badge.tsx` |
| `BadgeChip` | Badge status chip with dot indicator | `components/BadgeChip.tsx` |
| `TagChip` | Tag chip with custom colors | `components/TagChip.tsx` |
| `Clock` | Real-time clock display | `components/Clock.tsx` |
| `ConnectionStatus` | WebSocket connection status indicator | `components/ConnectionStatus.tsx` |
| `PresenceCards` | Presence statistics cards | `components/PresenceCards.tsx` |
| `DivisionStats` | Division-specific statistics | `components/DivisionStats.tsx` |
| `StatsCard` | Generic statistics card | `components/StatsCard.tsx` |
| `EmptyState` | Empty state placeholder | `components/EmptyState.tsx` |
| `Logo` | Sentinel logo with variants | `components/Logo.tsx` |

### Activity & Logging

| Component | Description | File |
|-----------|-------------|------|
| `ActivityPanel` | Activity feed panel with filters | `components/ActivityPanel.tsx` |
| `LogViewer` | System log viewer with level filtering | `components/LogViewer.tsx` |

### Data Display

| Component | Description | File |
|-----------|-------------|------|
| `DataTable` | Enhanced table with sorting, pagination, selection | `components/DataTable.tsx` |
| `SearchBar` | Search input with debouncing | `components/SearchBar.tsx` |
| `TablePagination` | Table pagination controls | `components/Pagination.tsx` |

### Network Status

| Component | Description | File |
|-----------|-------------|------|
| `NetworkIndicator` | Network connectivity indicator | `components/NetworkIndicator.tsx` |
| `SyncStatus` | Sync progress indicator | `components/SyncStatus.tsx` |

### Tooltips

| Component | Description | File |
|-----------|-------------|------|
| `IconTooltip` | Simple tooltip wrapper for icon buttons | `components/tooltips/IconTooltip.tsx` |
| `StatusTooltip` | Status-specific tooltip with color coding | `components/tooltips/StatusTooltip.tsx` |
| `TruncatedText` | Text with overflow ellipsis and tooltip | `components/tooltips/TruncatedText.tsx` |

### Layout

| Component | Description | File |
|-----------|-------------|------|
| `PageWrapper` | Page container with consistent padding | `components/PageWrapper.tsx` |
| `SkipNav` | Accessibility skip navigation link | `components/SkipNav.tsx` |

### Loading Skeletons

| Component | Description | File |
|-----------|-------------|------|
| `Skeleton` | Generic skeleton loader (wraps HeroUI's Skeleton) | `components/Skeleton.tsx` |
| `TableSkeleton` | Table skeleton loader | `components/TableSkeleton.tsx` |
| `CardSkeleton` | Card skeleton loader | `components/CardSkeleton.tsx` |

### Error Handling

| Component | Description | File |
|-----------|-------------|------|
| `ErrorBoundary` | React error boundary wrapper | `components/ErrorBoundary.tsx` |
| `ErrorFallback` | Error fallback UI with variants | `components/ErrorFallback.tsx` |
| `ConfirmDialog` | Confirmation dialog with variants | `components/ConfirmDialog.tsx` |

### Icon

| Component | Description | File |
|-----------|-------------|------|
| `Icon` | Iconify icon wrapper with consistent sizing | `components/Icon.tsx` |

---

## Utilities

### Rank Sorting

Functions for sorting members by rank and mess (Officer/Junior ranks):

```typescript
import { sortMembersByRank, sortMembersByMess, isOfficer } from '@sentinel/ui';

// Sort by rank priority
const sortedByRank = sortMembersByRank(members);

// Sort by mess (Officers first, then Junior ranks)
const sortedByMess = sortMembersByMess(members);

// Combined sort (mess, then rank within mess)
const sorted = sortMembers(members);

// Check if officer
if (isOfficer(member.rank)) {
  // ...
}
```

Location: `shared/utils/rank-sorting.ts`

### Chip Variants

Centralized chip variant configuration for consistent UI:

```typescript
import {
  getMemberStatusChipVariant,
  getBadgeStatusChipVariant,
  getTagChipVariant,
  getMemberTypeChipVariant,
  getDivisionChipVariant
} from '@sentinel/ui';

<Chip variant={getMemberStatusChipVariant()}>Active</Chip>
<Chip variant={getBadgeStatusChipVariant()}>Badge</Chip>
<Chip {...getMemberTypeChipVariant()}>Full-Time</Chip>
```

Location: `shared/utils/chip-variants.ts`

### Tag Colors

Get HeroUI color names for tags:

```typescript
import { getTagColor } from '@sentinel/ui';

const color = getTagColor(tag.color); // Returns HeroUI color name
<Chip color={color}>{tag.name}</Chip>
```

Location: `shared/utils/tag-colors.ts`

### Activity Feed

Utilities for activity feed filtering and display:

```typescript
import {
  filterActivityItems,
  getActivityBorderColor,
  getActivityBadgeLabel,
  VISIT_TYPE_LABELS
} from '@sentinel/ui';

const filtered = filterActivityItems(items, {
  type: 'member',
  direction: 'in',
});

const borderColor = getActivityBorderColor(item);
const label = getActivityBadgeLabel(item);
```

Location: `shared/utils/activity-feed.ts`

### Log Formatting

Utilities for log viewer display:

```typescript
import {
  getLogLevelColor,
  formatLogTime,
  truncateId,
  truncateMessage,
  getLogLevelLabel
} from '@sentinel/ui';

const color = getLogLevelColor('error'); // Returns HeroUI color name
const time = formatLogTime(timestamp);
const shortId = truncateId(correlationId);
```

Location: `shared/utils/log-formatting.ts`

---

## Hooks

### useDebounce

Debounce a value with configurable delay:

```typescript
import { useDebounce } from '@sentinel/ui';

function SearchComponent() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300); // 300ms delay

  useEffect(() => {
    // This only runs after user stops typing for 300ms
    fetchResults(debouncedSearch);
  }, [debouncedSearch]);

  return <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />;
}
```

Location: `hooks/useDebounce.ts`

### useIsOverflowing

Detect if an element's content is overflowing:

```typescript
import { useIsOverflowing } from '@sentinel/ui';

function TextComponent() {
  const { ref, isOverflowing } = useIsOverflowing<HTMLDivElement>();

  return (
    <div ref={ref} className="truncate">
      {isOverflowing && <Tooltip>Full text here</Tooltip>}
      Long text that might overflow...
    </div>
  );
}
```

Location: `hooks/useIsOverflowing.ts`

---

## Testing

### Test Structure

```
shared/ui/
├── components/
│   └── __test__/           # Component tests (future)
├── hooks/
│   └── __test__/           # Hook tests (future)
└── utils/                  # In shared/utils/
    └── __test__/           # Utility tests (future)
```

### Test Runner

Use **Vitest** for testing:

```bash
cd shared/ui
bun test          # Run all tests
bun test --watch  # Watch mode
bun test --ui     # UI mode
```

---

## Governance

### Import Restrictions

**NEVER import from app directories:**

```typescript
// ❌ WRONG - No app imports
import { useAuth } from '../../../frontend/src/hooks/useAuth';
import { api } from '../../../kiosk/src/lib/api';

// ✅ CORRECT - Only shared dependencies
import { Button } from '@heroui/react';
import type { Member } from '@sentinel/types';
```

### Color Usage

**Always use HeroUI semantic colors, never hardcoded hex:**

```tsx
// ❌ WRONG - Hardcoded colors
<Button className="bg-[#9a18b3] text-white">Click</Button>
<div style={{ color: '#205bcf' }}>Text</div>

// ✅ CORRECT - Semantic colors
<Button color="secondary">Click</Button>
<div className="text-primary">Text</div>

// ✅ CORRECT - CSS variables for custom cases
<div className="text-[var(--heroui-secondary)]">Text</div>
```

### Component Variants

**Prefer `extendVariants` for custom variants:**

```tsx
// ❌ AVOID - Inline className for repeated patterns
<Chip className="bg-success/20 border-success text-success-600">Active</Chip>
<Chip className="bg-success/20 border-success text-success-600">Active</Chip>

// ✅ CORRECT - extendVariants for reusable patterns
const StatusChip = extendVariants(Chip, {
  variants: {
    status: {
      active: {
        base: 'bg-success/20 border-success',
        content: 'text-success-600 dark:text-success-400',
      },
    },
  },
});

<StatusChip status="active">Active</StatusChip>
```

### PR Requirements

All changes to `shared/ui/` require:
1. **Type safety** - No `any` types
2. **Unit tests** - For utilities and hooks (component tests encouraged)
3. **Documentation** - Update this file for new exports
4. **No app dependencies** - Only import from `@heroui/react`, `@sentinel/types`, and standard libraries
5. **WCAG AA compliance** - All color combinations must meet 4.5:1 contrast ratio

---

## Color Palette Generators

These tools help generate accessible color scales and validate contrast ratios:

1. **Eva Design System Color Generator**
   - URL: https://colors.eva.design/
   - Generates full 50-950 scales from a single color
   - Shows WCAG compliance for each shade
   - Export as JSON, CSS, or Tailwind config

2. **Smart Watch Color Palette Generator**
   - URL: https://smart-swatch.netlify.app/
   - Material Design color scale generator
   - Exports to various formats (CSS, SCSS, JSON)
   - Shows contrast ratios

3. **Color Box by Lyft Design**
   - URL: https://colorbox.io/
   - Advanced color scale generation with interpolation controls
   - Export as CSS custom properties
   - Preview with text overlays

4. **Contrast Checker (WebAIM)**
   - URL: https://webaim.org/resources/contrastchecker/
   - Verify WCAG AA/AAA compliance for specific color pairs
   - Pass/fail for text sizes

---

## HeroUI Component Slots Reference

HeroUI components expose multiple "slots" (internal elements) that can be styled independently. Use the `classNames` prop to target slots.

### Common Slots

| Slot | Description | Components |
|------|-------------|------------|
| `base` | Root element | All components |
| `wrapper` | Inner wrapper | Card, Table, Modal, etc. |
| `content` | Content area | Card, Modal, Popover, etc. |
| `label` | Label text | Input, Select, Checkbox, etc. |
| `description` | Description text | Input, Select, etc. |
| `input` | Input field | Input, Textarea, Select |
| `trigger` | Trigger element | Dropdown, Popover, Modal |

### Component-Specific Slots

**Table:**
- `th` - Table header cell
- `td` - Table body cell
- `thead` - Table header
- `tbody` - Table body
- `tfoot` - Table footer

**Card:**
- `header` - Card header
- `body` - Card body
- `footer` - Card footer

**Button:**
- `base` - Button element
- `content` - Button content

**Modal:**
- `backdrop` - Modal backdrop
- `closeButton` - Close button

See [HeroUI documentation](https://heroui.com) for complete slot references.

---

## Mode-Specific Tokens

### Kiosk Mode

Larger touch targets and fonts for touch interaction:

```css
.kiosk-mode {
  --heroui-radius-medium: 12px;
}

.kiosk-mode [data-slot="base"] {
  min-height: 56px;     /* WCAG AAA touch target */
  font-size: 1.125rem;  /* 18px */
}
```

Usage:
```tsx
<div className="kiosk-mode">
  <Button>Large Touch Button</Button>
</div>
```

### TV Mode

Passive display optimizations (no hover states, larger fonts):

```css
.tv-mode {
  --heroui-font-size-large: 2rem;
}

.tv-mode * {
  cursor: default !important;  /* No pointer cursor */
}
```

Usage:
```tsx
<div className="tv-mode">
  <StatsCard variant="large">Stats</StatsCard>
</div>
```

### Reduced Motion (Pi Performance)

Automatically applied via media query:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Shadow Breathing Room Pattern

HeroUI cards have shadows that get clipped by `overflow-auto` or `overflow-hidden` containers. Use the negative margin + positive padding pattern to give shadows room:

```tsx
// On any element with overflow-auto or overflow-hidden
<div className="-mx-1 -my-1 overflow-auto px-1 py-1">
  <Card>Content</Card>
</div>

// For HeroUI Table with shadow breathing room
<Table
  classNames={{
    base: '-mx-1 -my-1 flex-1 overflow-hidden px-1 py-1',
    wrapper: 'max-h-full overflow-auto',
  }}
>
  {/* ... */}
</Table>

// When bottom padding is already set (e.g., pb-6)
<div className="-mx-1 -mt-1 overflow-auto px-1 pt-1 pb-6">
  <Card>Content</Card>
</div>
```

**Why this works:** Negative margins expand the element's boundary outside its box, while positive padding creates internal space for shadows to render without clipping.

---

## Additional Resources

- **HeroUI Official Docs**: https://heroui.com
- **HeroUI Documentation (Local)**: `/docs/heroui/CLAUDE.md`
- **Sentinel Project CLAUDE.md**: `/sentinel/CLAUDE.md`
- **Shared Types**: `/shared/types/index.ts`
- **Color Palette Tools**: See "Color Palette Generators" section above

---

**Last Updated**: 2026-01-16
**HeroUI Version**: 2.8.5+
**Package Name**: @sentinel/ui
