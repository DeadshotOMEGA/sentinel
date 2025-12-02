# Sentinel Components Quick Reference

## Badge Component (WCAG AA Accessible)

**Location:** `/shared/ui/components/Badge.tsx`
**Import:** `import { Badge, type BadgeVariant } from '@sentinel/ui'`

### 13 Variants Available

```tsx
// Attendance Status
<Badge variant="present">Checked In</Badge>      // Green
<Badge variant="absent">Absent</Badge>            // Red
<Badge variant="visitor">Visitor</Badge>          // Orange
<Badge variant="excused">Excused</Badge>          // Blue

// Activity Status
<Badge variant="active">Active</Badge>            // Green
<Badge variant="inactive">Inactive</Badge>        // Gray

// Form Status
<Badge variant="draft">Draft</Badge>              // Gray
<Badge variant="pending">Pending</Badge>          // Amber

// Generic Status
<Badge variant="success">Success</Badge>          // Green
<Badge variant="warning">Warning</Badge>          // Amber
<Badge variant="error">Error</Badge>              // Red
<Badge variant="info">Info</Badge>                // Blue
<Badge variant="neutral">Neutral</Badge>          // Gray
```

### Size Options

```tsx
<Badge variant="present" size="sm">Small</Badge>       // text-xs
<Badge variant="present" size="md">Medium</Badge>      // text-sm (default)
<Badge variant="present" size="lg">Large</Badge>       // text-base
```

### Custom Icon Override

```tsx
import { Badge } from '@sentinel/ui';
import { Building } from 'lucide-react';

<Badge variant="visitor" icon={Building}>Official Visit</Badge>
```

### Accessibility Features

- ✓ Icons are `aria-hidden="true"` (decorative only)
- ✓ `role="status"` for screen readers
- ✓ Text provides semantic meaning
- ✓ 4.5:1 contrast ratio enforced
- ✓ WCAG AA compliant

---

## All Custom Components

| Component | Import | Use Case | Variants |
|-----------|--------|----------|----------|
| **Badge** | `Badge` | Status indicators | 13 |
| **StatsCard** | `StatsCard` | Metrics display | 5 |
| **EmptyState** | `EmptyState` | Empty data states | 3 |
| **DataTable** | `DataTable` | Sortable table | — |
| **SearchBar** | `SearchBar` | Search input | — |
| **Pagination** | `TablePagination` | Table pagination | — |
| **Logo** | `Logo` | Branding | 3 sizes |
| **SkipNav** | `SkipNav` | A11y skip link | — |
| **Skeleton** | `SentinelSkeleton` | Loading state | — |
| **CardSkeleton** | `CardSkeleton` | Card loading | — |
| **TableSkeleton** | `TableSkeleton` | Table loading | — |
| **Icon** | `Icon` | Icon wrapper | — |
| **ErrorBoundary** | `ErrorBoundary` | Error handling | — |
| **ErrorFallback** | `ErrorFallback` | Error display | 4+ |
| **ConfirmDialog** | `ConfirmDialog` | Confirmation modal | 2+ |

---

## Component Import Examples

### Frontend Dashboard

```tsx
import { Badge, StatsCard, EmptyState, SearchBar, ConfirmDialog } from '@sentinel/ui';

export function Dashboard() {
  return (
    <>
      <StatsCard value={23} label="Present" variant="success" />
      <Badge variant="present">Checked In</Badge>
      <SearchBar />
      <EmptyState heading="No data" />
      <ConfirmDialog>Confirm action?</ConfirmDialog>
    </>
  );
}
```

### HeroUI Components (also via @sentinel/ui)

```tsx
import {
  Button,
  Card,
  CardBody,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Modal,
  Tabs,
  Tab,
} from '@sentinel/ui';

export function DataView() {
  return (
    <Card>
      <CardBody>
        <Table>
          {/* Table content */}
        </Table>
      </CardBody>
    </Card>
  );
}
```

---

## Design Tokens

**Location:** `/shared/ui/tokens.ts`

### Color Palette

```typescript
// Primary (Azure Blue)
#007fff (dark), #0066cc, #e6f3ff (light)

// Secondary/Accent (Orange)
#ff8000 (base), #ffa31a, #663300

// Success (Green)
#00b847 (base), #10b981, #e6f9ed

// Warning (Amber)
#ffc107 (base), #ffe01a, #fffce6

// Danger (Red)
#dc2626 (base), #ff1a1a, #ffe6e6
```

### Status Colors (Badge)

```typescript
statusColors: {
  success: { bg: '...', text: '...' },    // Green
  warning: { bg: '...', text: '...' },    // Amber
  error: { bg: '...', text: '...' },      // Red
  info: { bg: '...', text: '...' },       // Blue
  neutral: { bg: '...', text: '...' }     // Gray
}

badgeColors: {
  present: { bg: '...', text: '...' },    // Green
  absent: { bg: '...', text: '...' },     // Red
  visitor: { bg: '...', text: '...' },    // Orange
  active: { bg: '...', text: '...' },     // Green
  // ... 9 more variants
}
```

### Icons

All icons from Lucide React:

```tsx
import { CheckCircle, XCircle, AlertTriangle, ... } from '@sentinel/ui/icons';
```

---

## Apps Using Components

### Frontend (Admin Dashboard)
- **Badge** — Reports, Events, Members, Visitors, Dashboard
- **StatsCard** — Reports
- **SearchBar** — Events, Visitors
- **EmptyState** — Visitors, Dashboard
- **ConfirmDialog** — Visitors
- **ErrorBoundary** — App root

### Kiosk (NFC Check-in)
- **ErrorBoundary** — App root only

### TV Display (Wall Monitor)
- **ErrorBoundary** — App root only

---

## Tech Stack Summary

| Layer | Technology |
|-------|------------|
| **Design System** | @sentinel/ui (custom components + HeroUI) |
| **UI Library** | HeroUI 2.8.5 (frontend), 3.0.0-beta.2 (kiosk, tv-display) |
| **CSS Framework** | Tailwind CSS 4.1.17 |
| **Icons** | Lucide React |
| **State** | Zustand (kiosk/tv-display), React Query (frontend) |
| **Frontend** | React 18.2 + TypeScript |
| **Kiosk** | React 19.2 + TypeScript |
| **Build Tool** | Vite 5.0+ |

---

## Common Patterns

### Using Variant-Based Components

All custom components use TypeScript discriminated unions:

```tsx
<Badge variant="present">Works with 13 specific variants</Badge>
<StatsCard variant="success">Works with 5 specific variants</StatsCard>
<EmptyState variant="no-data">Works with 3 specific variants</EmptyState>
```

**Benefits:**
- Type-safe at compile time
- No invalid variant strings accepted
- IDE autocomplete for all options
- Runtime validation (throws on invalid variant)

### Combining Components

```tsx
import {
  Card,
  CardBody,
  Badge,
  StatsCard,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from '@sentinel/ui';

export function Report() {
  return (
    <Card>
      <CardBody>
        <StatsCard value={45} label="Total Members" variant="info" />
        <Table>
          <TableHeader>
            <TableColumn>Name</TableColumn>
            <TableColumn>Status</TableColumn>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell>{member.name}</TableCell>
                <TableCell>
                  <Badge variant={member.status}>
                    {member.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardBody>
    </Card>
  );
}
```

---

## Files to Know

### Component Library
- `/shared/ui/index.ts` — Main exports
- `/shared/ui/components/` — All component files
- `/shared/ui/tokens.ts` — Design tokens
- `/shared/ui/theme.css` — Custom CSS

### Frontend Examples
- `/frontend/src/pages/Reports.tsx` — Badge + StatsCard usage
- `/frontend/src/pages/Events.tsx` — Badge variant usage
- `/frontend/src/pages/Visitors.tsx` — Multiple components

### Apps
- `/frontend/` — Admin dashboard (full component usage)
- `/kiosk/` — NFC check-in (minimal UI)
- `/tv-display/` — Wall monitor (passive display)

---

## Version Info (⚠️ Important)

**HeroUI Version Mismatch Alert:**

- `@sentinel/ui` requires HeroUI 2.8.5
- `frontend` uses 2.8.5 ✓
- `kiosk` uses 3.0.0-beta.2 ✗ (BETA)
- `tv-display` uses 3.0.0-beta.2 ✗ (BETA)

**Action:** Align all apps to stable version (2.8.5 or 3.0 final)

---

## Accessibility Compliance

**All components follow WCAG AA (4.5:1 contrast minimum):**

- ✓ Badge — Fully accessible
- ✓ StatsCard — Fully accessible
- ✓ EmptyState — Fully accessible
- ✓ DataTable — Fully accessible
- ✓ SearchBar — Fully accessible
- ✓ ErrorBoundary — Fully accessible
- ✓ ErrorFallback — Fully accessible

**Tested with:** Axe DevTools, manual verification

---

## Creating New Components

### Template

```tsx
// components/NewComponent.tsx
import { ComponentProps } from 'react';

export type NewComponentVariant = 'variant1' | 'variant2' | 'variant3';

interface NewComponentProps {
  variant: NewComponentVariant;
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}

/**
 * NewComponent description
 *
 * Accessibility: Follows WCAG AA guidelines
 *
 * @example
 * ```tsx
 * <NewComponent variant="variant1">Content</NewComponent>
 * ```
 */
export function NewComponent({
  variant,
  size = 'md',
  children,
  className = '',
}: NewComponentProps) {
  // Implementation using tokens
  return (
    <div role="region" className={className}>
      {children}
    </div>
  );
}
```

### Export from `index.ts`

```typescript
export { NewComponent, type NewComponentVariant } from './components/NewComponent';
```

---

## Troubleshooting

### Badge not showing icon
- Verify icon component is imported
- Check if `aria-hidden="true"` is set
- Icon should be from Lucide React

### Colors look wrong
- Verify color tokens in `/shared/ui/tokens.ts`
- Check 4.5:1 contrast ratio
- Run Axe audit

### Type errors
- Ensure using correct variant names
- Check TypeScript version (5.3+)
- Verify component props interface

### HeroUI component conflicts
- Check HeroUI version (should be 2.8.5 or stable 3.0)
- Clear node_modules and reinstall
- Verify peer dependencies

---

## Resources

- **Design System:** `/shared/ui/index.ts`
- **Component Docs:** JSDoc comments in each file
- **Design Tokens:** `/shared/ui/tokens.ts`
- **Investigation Docs:** `/docs/SHARED-UI-INVESTIGATION-SUMMARY.md`
- **Badge Assessment:** `/docs/temp/badge-component-assessment.md`
- **Usage Matrix:** `/docs/temp/component-usage-matrix.md`
