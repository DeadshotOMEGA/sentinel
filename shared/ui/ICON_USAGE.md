# Icon System Usage

Lucide React icon library integration for Sentinel.

## Installation

Icons are part of `@sentinel/ui` package. Already installed via `lucide-react` dependency.

## Basic Usage

```tsx
import { Icon, icons } from '@sentinel/ui';

// Standalone icon (requires aria-label)
<Icon icon={icons.Users} size="md" aria-label="Users" />

// Decorative icon inside button
<Button>
  <Icon icon={icons.Plus} size="sm" aria-hidden />
  Add Member
</Button>
```

## Size Variants

| Size | Pixels | Use Case |
|------|--------|----------|
| `sm` | 16px | Inline with text, tight spaces |
| `md` | 20px | Default size, most UI elements |
| `lg` | 24px | Headers, prominent actions |
| `xl` | 32px | Hero sections, empty states |

## Color Overrides

Use Tailwind classes via `className`:

```tsx
<Icon
  icon={icons.AlertCircle}
  size="lg"
  className="text-danger"
  aria-label="Error"
/>
```

## Accessibility

**Standalone icons** (no accompanying text) require `aria-label`:
```tsx
<Icon icon={icons.Search} aria-label="Search" />
```

**Decorative icons** (inside buttons/links with text) should use `aria-hidden`:
```tsx
<Button>
  <Icon icon={icons.Save} aria-hidden />
  Save Changes
</Button>
```

## Available Icons (46 total)

### User Management
Users, UserCheck, UserX, UserPlus, UserMinus

### Time/Calendar
Clock, Calendar, CalendarDays

### Navigation
Home, Settings, LogOut, Menu

### Search/Filter
Search, Filter

### Chevrons
ChevronDown, ChevronUp, ChevronLeft, ChevronRight

### Actions
Plus, Minus, X, Check

### Alerts
AlertCircle, AlertTriangle, Info

### Network
Wifi, WifiOff

### Building/Facility
Building, DoorOpen, DoorClosed

### Analytics
Activity, BarChart3, TrendingUp, TrendingDown

### Files
FileText, Download, Upload

### Edit Operations
Edit, Trash2, Save

### Visibility
Eye, EyeOff

### Utility
RefreshCw, MoreVertical, MoreHorizontal, ExternalLink

## Adding New Icons

1. Import from `lucide-react` in `/home/sauk/projects/sentinel/shared/ui/icons.ts`
2. Add to appropriate category
3. Export with consistent naming (PascalCase)

## TypeScript Support

Full type safety via `LucideIcon` type:

```tsx
import { Icon } from '@sentinel/ui';
import { icons } from '@sentinel/ui';
import type { LucideIcon } from 'lucide-react';

// Type-safe icon prop
interface ButtonProps {
  icon?: LucideIcon;
  label: string;
}
```
