# Dashboard Redesign - Phase 1: Technical Specifications

## Overview

Phase 1 establishes the foundational layout and data model for the redesigned Dashboard. Introduces unified person card grid, collapsible activity panel, and shared filtering across both views.

## Shared Type Definitions

### Location
`/home/sauk/projects/sentinel/shared/types/index.ts`

### New Types

```typescript
export type PresentPersonType = 'member' | 'visitor';

export interface PresentPerson {
  id: string;
  type: PresentPersonType;
  name: string;
  checkInTime: Date;
  kioskId?: string;
  kioskName?: string;

  // Member-specific fields
  rank?: string;
  division?: string;
  divisionId?: string;
  memberType?: MemberType;

  // Visitor-specific fields
  organization?: string;
  visitType?: VisitType;
  visitReason?: string;
  hostMemberId?: string;
  hostName?: string;
  eventId?: string;
  eventName?: string;
}

export interface DashboardFilters {
  typeFilter: 'all' | 'members' | 'visitors';
  directionFilter: 'all' | 'in' | 'out';
  searchQuery: string;
}
```

### Design Rationale

**PresentPerson**
- Unified interface for members and visitors currently present
- Single `type` discriminator for rendering logic
- Preserves type-specific fields as optional properties
- Uses `checkInTime` instead of `timestamp` for semantic clarity

**DashboardFilters**
- Encapsulates all filter state in single object
- Enables consistent filtering across person grid and activity list
- Direction filter applies only to activity list (person grid shows "in" only)

## Backend API

### New Endpoint

**GET /api/checkins/presence/all**

Returns combined list of currently present members and active visitors.

**Authentication:** Requires `requireDisplayAuth` middleware (admin/kiosk/display)

**Response Schema:**
```typescript
{
  presentPeople: PresentPerson[]
}
```

**Implementation Notes:**
- Query present members from `checkin_repository.getPresentMembers()`
- Query active visitors from `visitor_repository.findActive()`
- Map members to `PresentPerson` with `type: 'member'`
- Map visitors to `PresentPerson` with `type: 'visitor'`
- Combine arrays and return

**Example Response:**
```json
{
  "presentPeople": [
    {
      "id": "uuid-1",
      "type": "member",
      "name": "AB Smith, Jane",
      "rank": "AB",
      "division": "Ops",
      "divisionId": "uuid-div",
      "memberType": "class_a",
      "checkInTime": "2025-12-04T09:30:00Z",
      "kioskId": "primary",
      "kioskName": "Primary Entrance"
    },
    {
      "id": "uuid-2",
      "type": "visitor",
      "name": "John Contractor",
      "organization": "ACME Corp",
      "visitType": "contractor",
      "visitReason": "HVAC maintenance",
      "hostName": "PO2 Johnson, Robert",
      "checkInTime": "2025-12-04T10:15:00Z",
      "kioskId": "primary",
      "kioskName": "Primary Entrance"
    }
  ]
}
```

### Modified Service

**File:** `/home/sauk/projects/sentinel/backend/src/services/presence-service.ts`

Add method:
```typescript
async getAllPresentPeople(): Promise<PresentPerson[]> {
  const members = await this.getPresentMembers();
  const visitors = await visitorRepository.findActive();

  const presentMembers: PresentPerson[] = members.map(m => ({
    id: m.id,
    type: 'member',
    name: `${m.rank} ${m.firstName} ${m.lastName}`,
    rank: m.rank,
    division: m.division.name,
    divisionId: m.divisionId,
    memberType: m.memberType,
    checkInTime: m.lastCheckinTime, // from presence query
    kioskId: m.lastKioskId,
    kioskName: getKioskName(m.lastKioskId),
  }));

  const presentVisitors: PresentPerson[] = visitors.map(v => ({
    id: v.id,
    type: 'visitor',
    name: v.name,
    organization: v.organization,
    visitType: v.visitType,
    visitReason: v.purpose,
    hostMemberId: v.hostMemberId,
    hostName: v.hostMember ? `${v.hostMember.rank} ${v.hostMember.firstName} ${v.hostMember.lastName}` : undefined,
    eventId: v.eventId,
    eventName: v.event?.name,
    checkInTime: v.checkInTime,
    kioskId: undefined, // Not tracked for visitors
    kioskName: undefined,
  }));

  return [...presentMembers, ...presentVisitors];
}
```

## Frontend Components

### DashboardHeader

**File:** `/home/sauk/projects/sentinel/frontend/src/components/dashboard/DashboardHeader.tsx`

**Purpose:** Displays dashboard title and navigation chips for member/visitor counts.

**Props:**
```typescript
interface DashboardHeaderProps {
  title: string;
  memberCount: number;
  visitorCount: number;
}
```

**Layout:**
- Left: `<h2>` with title text
- Right: Two HeroUI `<Chip>` components side-by-side

**Chip Specifications:**
- Variant: `bordered`
- Background: `bg-white`
- Icons: Lucide React `Users` (members), `UserCheck` (visitors)
- Icon colors: `text-success-600` (members), `text-primary-600` (visitors)
- Labels: `{count} Members` / `{count} Visitors`
- Click behavior: `useNavigate()` to `/members` or `/visitors`

**Implementation Notes:**
- Use `flex justify-between items-center` layout
- Chips should have `cursor-pointer` and hover states
- Accessible: include `role="button"` and `aria-label` on chips

**Example:**
```tsx
<div className="flex justify-between items-center mb-4">
  <h2 className="text-2xl font-semibold">{title}</h2>
  <div className="flex gap-3">
    <Chip
      variant="bordered"
      className="bg-white cursor-pointer"
      onClick={() => navigate('/members')}
      startContent={<Users className="w-4 h-4 text-success-600" />}
    >
      {memberCount} Members
    </Chip>
    <Chip
      variant="bordered"
      className="bg-white cursor-pointer"
      onClick={() => navigate('/visitors')}
      startContent={<UserCheck className="w-4 h-4 text-primary-600" />}
    >
      {visitorCount} Visitors
    </Chip>
  </div>
</div>
```

### FilterBar

**File:** `/home/sauk/projects/sentinel/frontend/src/components/dashboard/FilterBar.tsx`

**Purpose:** Unified filter controls for type, direction, search, and select mode.

**Props:**
```typescript
interface FilterBarProps {
  filters: DashboardFilters;
  onFiltersChange: (filters: DashboardFilters) => void;
  selectMode: boolean;
  onSelectModeChange: (enabled: boolean) => void;
  selectedCount: number;
}
```

**Layout:** Horizontal flex row with dividers between sections

**Sections:**
1. **Type Filter Chips** - All | Members | Visitors
2. **Direction Filter Chips** - All | In | Out
3. **Search Input** - Underlined variant, 300ms debounce
4. **Select Mode Toggle** - Button with checkbox icon

**Chip Behavior:**
- Active state: `variant="solid"`, `color="primary"`
- Inactive state: `variant="bordered"`, `color="default"`
- Cursor: `cursor-pointer`
- Click updates `filters.typeFilter` or `filters.directionFilter`

**Search Input:**
- HeroUI `<Input>` with `variant="underlined"`
- Placeholder: "Search by name, rank, division..."
- Width: `w-64`
- Clear button enabled
- Debounced: 300ms delay before triggering `onFiltersChange`

**Select Mode Button:**
- HeroUI `<Button>` with `variant="light"`
- Shows: "Select ({selectedCount})" when active, "Select" when inactive
- Color: `primary` when active, `default` when inactive
- Icon: CheckSquare (active) or Square (inactive) from Lucide

**Accessibility:**
- All chips have `role="button"` and `aria-pressed` state
- Search input has `aria-label="Search present people"`
- Select mode button has `aria-label="Toggle selection mode"`

**Example:**
```tsx
<div className="flex items-center gap-4 pb-4 border-b">
  {/* Type Filter */}
  <div className="flex gap-2">
    {(['all', 'members', 'visitors'] as const).map(type => (
      <Chip
        key={type}
        variant={filters.typeFilter === type ? 'solid' : 'bordered'}
        color={filters.typeFilter === type ? 'primary' : 'default'}
        className="cursor-pointer"
        onClick={() => onFiltersChange({ ...filters, typeFilter: type })}
      >
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Chip>
    ))}
  </div>

  {/* Direction Filter */}
  <Divider orientation="vertical" className="h-6" />
  {/* ... similar structure ... */}

  {/* Search */}
  <Input
    variant="underlined"
    placeholder="Search..."
    value={filters.searchQuery}
    onChange={(e) => onFiltersChange({ ...filters, searchQuery: e.target.value })}
    isClearable
  />

  {/* Select Mode */}
  <Button
    variant="light"
    color={selectMode ? 'primary' : 'default'}
    onClick={() => onSelectModeChange(!selectMode)}
    startContent={selectMode ? <CheckSquare /> : <Square />}
  >
    Select {selectedCount > 0 && `(${selectedCount})`}
  </Button>
</div>
```

### PersonCard

**File:** `/home/sauk/projects/sentinel/frontend/src/components/dashboard/PersonCard.tsx`

**Purpose:** Individual card displaying a present member or visitor.

**Props:**
```typescript
interface PersonCardProps {
  person: PresentPerson;
  selectMode: boolean;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onPress: (person: PresentPerson) => void;
  isHighlighted?: boolean;
}
```

**Layout:** HeroUI `<Card>` with `isPressable` and `isHoverable`

**Card Structure:**
- Top row: Checkbox (if `selectMode`) + Avatar + Name/Rank
- Second row: Type chip (Member/Visitor)
- Third row: Division (members) or Organization (visitors)
- Fourth row: Check-in time + kiosk
- Fifth row (visitors only): Visit reason + host

**Styling:**
- Border: Highlight when `isHighlighted` or `isSelected`
- Avatar: Initials from name, colored by type (success for members, primary for visitors)
- Chips: Small size, flat variant
- Text hierarchy: Name (medium), metadata (small), timestamps (extra small)

**Interaction:**
- Click anywhere (non-checkbox): Trigger `onPress(person)` for detail view
- Click checkbox: Trigger `onSelect(person.id)`
- Hover: Subtle background change

**Member Card Example:**
```tsx
<Card
  isPressable
  isHoverable
  className={cn(
    'p-4',
    isSelected && 'border-2 border-primary',
    isHighlighted && 'ring-2 ring-warning'
  )}
  onClick={() => onPress(person)}
>
  <div className="flex items-start gap-3">
    {selectMode && (
      <Checkbox
        isSelected={isSelected}
        onValueChange={() => onSelect(person.id)}
        onClick={(e) => e.stopPropagation()}
      />
    )}
    <Avatar name={person.name} color="success" />
    <div className="flex-1">
      <div className="flex items-center justify-between">
        <p className="font-medium">{person.name}</p>
        <Chip size="sm" variant="flat" color="success">Member</Chip>
      </div>
      <p className="text-sm text-default-500">{person.division}</p>
      <p className="text-xs text-default-400">
        {formatDistanceToNow(person.checkInTime, { addSuffix: true })}
        {person.kioskName && ` • ${person.kioskName}`}
      </p>
    </div>
  </div>
</Card>
```

**Visitor Card Example:**
```tsx
{/* Similar structure but includes: */}
<p className="text-sm text-default-500">{person.organization}</p>
{person.visitReason && (
  <p className="text-xs text-default-400">{person.visitReason}</p>
)}
{person.hostName && (
  <p className="text-xs text-default-400">Host: {person.hostName}</p>
)}
```

### PersonCardGrid

**File:** `/home/sauk/projects/sentinel/frontend/src/components/dashboard/PersonCardGrid.tsx`

**Purpose:** Responsive grid of person cards with filtering and sorting.

**Props:**
```typescript
interface PersonCardGridProps {
  people: PresentPerson[];
  filters: DashboardFilters;
  selectMode: boolean;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onPersonPress: (person: PresentPerson) => void;
}
```

**Filtering Logic:**
```typescript
const filteredPeople = useMemo(() => {
  return people.filter(person => {
    // Type filter
    if (filters.typeFilter === 'members' && person.type !== 'member') return false;
    if (filters.typeFilter === 'visitors' && person.type !== 'visitor') return false;

    // Search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const nameMatch = person.name.toLowerCase().includes(query);
      const divMatch = person.division?.toLowerCase().includes(query);
      const orgMatch = person.organization?.toLowerCase().includes(query);
      if (!nameMatch && !divMatch && !orgMatch) return false;
    }

    return true;
  });
}, [people, filters]);
```

**Sorting Logic:**
```typescript
const sortedPeople = useMemo(() => {
  return [...filteredPeople].sort((a, b) => {
    // Visitors first
    if (a.type !== b.type) {
      return a.type === 'visitor' ? -1 : 1;
    }
    // Within type, newest first
    return b.checkInTime.getTime() - a.checkInTime.getTime();
  });
}, [filteredPeople]);
```

**Grid Layout:**
```tsx
<div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
  {sortedPeople.map(person => (
    <PersonCard
      key={person.id}
      person={person}
      selectMode={selectMode}
      isSelected={selectedIds.has(person.id)}
      onSelect={handleSelect}
      onPress={onPersonPress}
    />
  ))}
</div>
```

**Empty State:**
```tsx
{sortedPeople.length === 0 && (
  <div className="text-center py-12">
    <p className="text-default-500">No one is currently present</p>
  </div>
)}
```

### CollapsibleActivityPanel

**File:** `/home/sauk/projects/sentinel/frontend/src/components/dashboard/CollapsibleActivityPanel.tsx`

**Purpose:** Activity feed that can collapse to a narrow sidebar.

**Props:**
```typescript
interface CollapsibleActivityPanelProps {
  activity: ActivityItem[];
  filters: DashboardFilters;
  isCollapsed: boolean;
  onCollapseChange: (collapsed: boolean) => void;
}
```

**Layout States:**

**Expanded (Default):**
- Width: `w-96` (384px)
- Structure: Header + scrollable activity list
- Header: "Activity" title + collapse button (ChevronRight icon)
- Activity list: Same rendering as current ActivityPanel
- Applies `filters.typeFilter`, `filters.directionFilter`, `filters.searchQuery`

**Collapsed:**
- Width: `w-12` (48px)
- Structure: Vertical "Activity" text + last activity timestamp
- Collapse button rotates 180deg (ChevronLeft icon)
- Click anywhere to expand

**Collapse Button:**
- Position: Absolute, left edge of panel
- HeroUI `<Button>` with `isIconOnly`, `variant="light"`
- Icon rotates based on state
- Accessible: `aria-label="Collapse activity panel"` / "Expand activity panel"

**Activity Rendering:**
- Reuse filtering logic from current ActivityPanel
- Apply type, direction, and search filters
- Show border indicator for in/out direction
- Display relative timestamps with tooltip

**Example Structure:**
```tsx
<div className={cn(
  'transition-all duration-300',
  isCollapsed ? 'w-12' : 'w-96'
)}>
  {isCollapsed ? (
    <div
      className="h-full bg-default-100 flex items-center justify-center cursor-pointer"
      onClick={() => onCollapseChange(false)}
    >
      <p className="transform rotate-90 text-sm font-medium whitespace-nowrap">
        Activity
      </p>
      {lastActivity && (
        <p className="transform rotate-90 text-xs text-default-400 mt-2">
          {formatDistanceToNow(new Date(lastActivity.timestamp), { addSuffix: true })}
        </p>
      )}
    </div>
  ) : (
    <Card className="h-full">
      <CardHeader className="flex justify-between">
        <h3 className="font-semibold">Activity</h3>
        <Button
          isIconOnly
          variant="light"
          size="sm"
          onClick={() => onCollapseChange(true)}
        >
          <ChevronRight />
        </Button>
      </CardHeader>
      <CardBody className="overflow-y-auto">
        {/* Activity list rendering */}
      </CardBody>
    </Card>
  )}
</div>
```

## Dashboard Page Refactor

**File:** `/home/sauk/projects/sentinel/frontend/src/pages/Dashboard.tsx`

**New Layout Structure:**
```
┌─────────────────────────────────────────────┐
│ DashboardHeader                             │
├─────────────────────────────────────────────┤
│ FilterBar                                   │
├──────────────────────────────────┬──────────┤
│                                  │          │
│ PersonCardGrid                   │ Activity │
│ (flex-1, scrollable)             │ Panel    │
│                                  │ (fixed)  │
│                                  │          │
└──────────────────────────────────┴──────────┘
```

**State Management:**
```typescript
const [filters, setFilters] = useState<DashboardFilters>({
  typeFilter: 'all',
  directionFilter: 'all',
  searchQuery: ''
});
const [selectMode, setSelectMode] = useState(false);
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
const [activityCollapsed, setActivityCollapsed] = useState(false);
```

**Data Fetching:**
```typescript
const { data: presentPeople, isLoading } = useQuery({
  queryKey: ['present-people'],
  queryFn: async () => {
    const response = await api.get<{ presentPeople: PresentPerson[] }>(
      '/checkins/presence/all'
    );
    return response.data.presentPeople;
  },
  refetchInterval: 30000, // Refresh every 30 seconds
});
```

**WebSocket Integration:**
- Keep existing activity feed WebSocket subscriptions
- On `checkin` event: invalidate `['present-people']` query to refetch
- On `visitor_signin` event: invalidate `['present-people']` query
- On `visitor_signout` event: invalidate `['present-people']` query

**Person Press Handler:**
```typescript
const handlePersonPress = (person: PresentPerson) => {
  if (person.type === 'member') {
    navigate(`/members/${person.id}`);
  } else {
    navigate(`/visitors/${person.id}`);
  }
};
```

## Design Tokens

**Colors:**
- Primary: `#007fff` (Azure Blue)
- Success: `#10b981` (Green) - Members
- Warning: `#ff8000` (Orange) - Visitors/Check-outs

**Spacing:**
- Card gap: `1rem` (16px)
- Header margin: `1rem`
- Panel padding: `1.5rem` (24px)

**Responsive Breakpoints:**
- `sm`: 640px - 2 columns
- `lg`: 1024px - 3 columns
- `xl`: 1280px - 4 columns

**Touch Targets:**
- Minimum: 48px (WCAG AA compliance)
- Cards: Entire surface clickable
- Checkboxes: 24px with surrounding padding

## Accessibility

**WCAG AA Requirements:**
- Contrast ratios: Minimum 4.5:1 for text
- Focus indicators: Visible on all interactive elements
- Keyboard navigation: Tab order follows visual layout
- Screen readers: Proper ARIA labels on all controls

**Keyboard Shortcuts:**
- Tab: Navigate between filter chips, search, cards
- Enter/Space: Activate focused chip or card
- Escape: Exit select mode

**ARIA Labels:**
- Filter chips: `aria-label="Filter by {type}"`
- Person cards: `aria-label="{name}, {type}, checked in {time}"`
- Activity panel: `aria-label="Recent activity feed"`

## Performance Considerations

**Optimization Strategies:**
- Use `React.memo` on PersonCard to prevent unnecessary re-renders
- Debounce search input to reduce filter recalculations
- Virtual scrolling if person count exceeds 100
- Lazy load activity list items (render viewport + buffer)

**Caching:**
- React Query caches present people for 30 seconds
- Stale-while-revalidate: Show cached data immediately, refetch in background
- Invalidate cache on WebSocket events for instant updates

## Testing Strategy

**Unit Tests:**
- PersonCard renders member/visitor correctly
- FilterBar updates filter state on chip click
- PersonCardGrid applies filters and sorting correctly

**Integration Tests:**
- Dashboard fetches and displays present people
- WebSocket events trigger query invalidation
- Person card click navigates to detail page

**E2E Tests (Playwright):**
- Member checks in, appears in person grid
- Visitor signs in, appears in person grid
- Filter chips show/hide correct people
- Search filters by name, division, organization
- Select mode enables checkboxes and selection
