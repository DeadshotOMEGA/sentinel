# Dashboard Redesign - Phase 1: Implementation Plan

## Phase Overview

Phase 1 establishes the core layout and data infrastructure for the redesigned Dashboard. Creates person card grid, collapsible activity panel, and unified filtering.

**Goals:**
- Unified view of present members and visitors
- Responsive card grid with filtering
- Collapsible activity feed
- Navigation from header to members/visitors pages
- Foundation for Phase 2 (modals) and Phase 3 (bulk actions)

**Non-Goals:**
- Individual person modals (Phase 2)
- Bulk check-out actions (Phase 3)
- Alert system (Phase 4)

## Task Breakdown

### 1. Shared Types

**File:** `/home/sauk/projects/sentinel/shared/types/index.ts`

**Tasks:**
- Add `PresentPersonType` type alias
- Add `PresentPerson` interface
- Add `DashboardFilters` interface
- Export all new types

**Validation:**
- TypeScript compiles without errors
- Types available in backend and frontend

**Estimated Time:** 15 minutes

---

### 2. Backend Endpoint

**Files:**
- `/home/sauk/projects/sentinel/backend/src/services/presence-service.ts`
- `/home/sauk/projects/sentinel/backend/src/routes/checkins.ts`

**Tasks:**
- Add `getAllPresentPeople()` method to PresenceService
- Query present members from `getPresentMembers()`
- Query active visitors from `visitorRepository.findActive()`
- Map both to `PresentPerson[]` format
- Add route `GET /api/checkins/presence/all`
- Apply `requireDisplayAuth` middleware
- Return `{ presentPeople: PresentPerson[] }`

**Validation:**
- Endpoint returns 200 with correct schema
- Members include division and memberType
- Visitors include organization and hostName
- Authentication required

**Testing:**
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/checkins/presence/all
```

**Estimated Time:** 1 hour

---

### 3. DashboardHeader Component

**File:** `/home/sauk/projects/sentinel/frontend/src/components/dashboard/DashboardHeader.tsx`

**Tasks:**
- Create functional component with props interface
- Render title on left
- Render two Chips on right (Members, Visitors)
- Use Lucide icons: `Users`, `UserCheck`
- Add `useNavigate()` click handlers
- Style with HeroUI bordered chips

**Props:**
```typescript
interface DashboardHeaderProps {
  title: string;
  memberCount: number;
  visitorCount: number;
}
```

**Validation:**
- Title displays correctly
- Chips show accurate counts
- Clicking Members chip navigates to `/members`
- Clicking Visitors chip navigates to `/visitors`
- Responsive layout on mobile

**Estimated Time:** 45 minutes

---

### 4. FilterBar Component

**File:** `/home/sauk/projects/sentinel/frontend/src/components/dashboard/FilterBar.tsx`

**Tasks:**
- Create functional component with props interface
- Render type filter chips (All/Members/Visitors)
- Render direction filter chips (All/In/Out)
- Render search input with underlined variant
- Render select mode toggle button
- Add 300ms debounce to search
- Update filter state on chip/input change

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

**Validation:**
- Filter chips toggle active state
- Search input debounces correctly
- Select mode button shows count when active
- All controls accessible via keyboard
- Layout responsive on mobile

**Estimated Time:** 1.5 hours

---

### 5. PersonCard Component

**File:** `/home/sauk/projects/sentinel/frontend/src/components/dashboard/PersonCard.tsx`

**Tasks:**
- Create functional component with props interface
- Render HeroUI Card with `isPressable` and `isHoverable`
- Show checkbox when `selectMode` enabled
- Render Avatar with initials
- Display name, type chip, metadata
- Format check-in time with `date-fns`
- Differentiate member vs visitor fields
- Handle click events for selection and press

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

**Validation:**
- Member cards show rank, division, member type
- Visitor cards show organization, visit type, host
- Checkbox appears only in select mode
- Card click triggers `onPress` (non-checkbox area)
- Checkbox click triggers `onSelect`
- Highlight styles apply when `isSelected` or `isHighlighted`

**Estimated Time:** 2 hours

---

### 6. PersonCardGrid Component

**File:** `/home/sauk/projects/sentinel/frontend/src/components/dashboard/PersonCardGrid.tsx`

**Tasks:**
- Create functional component with props interface
- Implement filtering logic (type, search)
- Implement sorting logic (visitors first, then newest)
- Render responsive grid (1-4 columns)
- Map filtered people to PersonCard components
- Handle selection state management
- Show empty state when no results

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

**Validation:**
- Filters apply correctly (type, search)
- Sorting: visitors first, newest within type
- Grid responsive at all breakpoints
- Empty state displays when no matches
- Selection updates parent state

**Estimated Time:** 2 hours

---

### 7. CollapsibleActivityPanel Component

**File:** `/home/sauk/projects/sentinel/frontend/src/components/dashboard/CollapsibleActivityPanel.tsx`

**Tasks:**
- Create functional component with props interface
- Implement expanded state (384px width)
- Implement collapsed state (48px width)
- Extract filtering logic from existing ActivityPanel
- Render activity list with direction borders
- Add collapse/expand toggle button
- Animate width transition
- Display vertical "Activity" text when collapsed

**Props:**
```typescript
interface CollapsibleActivityPanelProps {
  activity: ActivityItem[];
  filters: DashboardFilters;
  isCollapsed: boolean;
  onCollapseChange: (collapsed: boolean) => void;
}
```

**Validation:**
- Panel collapses smoothly to 48px
- Expanded panel shows full activity list
- Filters apply to activity items
- Collapse button accessible
- Click collapsed panel to expand

**Estimated Time:** 2.5 hours

---

### 8. Refactor Dashboard Page

**File:** `/home/sauk/projects/sentinel/frontend/src/pages/Dashboard.tsx`

**Tasks:**
- Replace existing layout with new structure
- Add state for `filters`, `selectMode`, `selectedIds`, `activityCollapsed`
- Fetch present people from new endpoint
- Keep existing WebSocket subscriptions
- Invalidate query on WebSocket events
- Render DashboardHeader component
- Render FilterBar component
- Render PersonCardGrid component
- Render CollapsibleActivityPanel component
- Implement person press handler (navigate to detail)
- Calculate member/visitor counts for header

**Validation:**
- Layout renders correctly: header, filter bar, grid, activity panel
- WebSocket events trigger refetch
- Person card click navigates to detail page
- Filters apply to both grid and activity
- Select mode persists across renders
- Activity panel collapses/expands

**Estimated Time:** 3 hours

---

### 9. Testing & Validation

**Tasks:**
- Test with mock data: 5 members, 3 visitors
- Verify filters work across grid and activity
- Test WebSocket events update grid in real-time
- Verify navigation from header chips
- Test select mode checkbox interactions
- Validate responsive layout on mobile/tablet/desktop
- Check accessibility: keyboard navigation, ARIA labels
- Run TypeScript compilation
- Run existing unit tests

**Validation Checklist:**
- [ ] Backend endpoint returns correct data
- [ ] Person cards render member/visitor differences
- [ ] Filter chips toggle and apply filters
- [ ] Search filters by name, division, organization
- [ ] Direction filter applies to activity only
- [ ] Select mode shows checkboxes
- [ ] Activity panel collapses to 48px
- [ ] WebSocket events update grid
- [ ] Navigation works from header and cards
- [ ] Layout responsive on all screen sizes
- [ ] WCAG AA contrast ratios met
- [ ] Keyboard navigation functional
- [ ] No TypeScript errors
- [ ] No console errors

**Estimated Time:** 2 hours

---

## Total Estimated Time

**Development:** 13.25 hours
**Testing:** 2 hours
**Total:** 15.25 hours (~2 days)

---

## Dependencies & Prerequisites

**Required Before Starting:**
- Existing Dashboard, ActivityPanel, PageWrapper components
- WebSocket infrastructure
- React Query setup
- HeroUI library installed
- Lucide React icons installed
- `date-fns` library installed

**External Dependencies:**
- No new libraries required
- Uses existing backend repositories

---

## Risks & Mitigations

**Risk:** Backend query performance degrades with many present people
**Mitigation:** Add database indexes on check-in timestamps and visitor check-out times. Limit query to last 24 hours.

**Risk:** WebSocket events cause excessive refetches
**Mitigation:** Use React Query's built-in deduplication and stale-while-revalidate strategy. Batch invalidations.

**Risk:** Large activity feed impacts render performance
**Mitigation:** Limit activity feed to last 100 items. Implement virtual scrolling if needed.

**Risk:** Filter state management becomes complex
**Mitigation:** Encapsulate all filter logic in FilterBar and PersonCardGrid. Use single `filters` object.

---

## Future Phases (Context Only)

### Phase 2: Modals & Individual Management
- Person detail modal (view member/visitor info)
- Check-out modal with confirmation
- Edit visitor details
- Member status indicators (late, on leave)

### Phase 3: Selection & Bulk Actions
- Select all / Select none buttons
- Bulk check-out selected people
- Bulk export to CSV
- Selection persistence across filter changes

### Phase 4: Alert System
- Late arrival alerts
- Unusual activity alerts
- Visitor overstay warnings
- Alert banner at top of dashboard
- Alert history panel

### Phase 5: Analytics & Insights
- Presence trends chart
- Peak hours heatmap
- Division presence breakdown
- Visitor type distribution

---

## Rollout Strategy

**Development Environment:**
- Implement all tasks in feature branch
- Test with local backend and seed data
- Verify WebSocket integration

**Staging Environment:**
- Deploy to staging server
- Test with production-like data
- Validate performance under load
- User acceptance testing with admin team

**Production Deployment:**
- Deploy during low-activity hours
- Enable feature flag for gradual rollout
- Monitor error rates and performance metrics
- Rollback plan: Revert to previous Dashboard component

---

## Success Metrics

**Functional:**
- Dashboard loads in < 2 seconds
- Filter application < 100ms
- WebSocket events reflected in < 500ms
- Zero TypeScript/linting errors

**User Experience:**
- Admins can identify present people at a glance
- Navigation to member/visitor details in 1 click
- Search finds people by name, division, org instantly
- Activity panel collapsible without losing state

**Technical:**
- Backend endpoint < 200ms response time
- Frontend bundle size increase < 50KB
- No accessibility violations (WCAG AA)
- Test coverage > 80% for new components

---

## Documentation Updates

**After Phase 1 Completion:**
- Update `/home/sauk/projects/sentinel/docs/REMAINING-TASKS.md`
- Add screenshots to feature docs
- Document new API endpoint in `api-contracts.yaml`
- Update user guide with new dashboard features
- Create admin training video (optional)

---

## Questions for Stakeholders

**Before Implementation:**
1. Should direction filter apply to person grid or only activity list?
2. What is the maximum expected present people count? (for performance planning)
3. Should select mode persist across page refresh?
4. Any custom sorting preferences for person grid?
5. Should collapsed activity panel width be adjustable?

**After Implementation:**
1. Is the person card layout intuitive?
2. Are filter chips discoverable enough?
3. Should we add more metadata to cards (e.g., duration present)?
4. Is activity panel position correct (right side)?
