# Sentinel Frontend Audit Remediation - Monday.com Task Breakdown

**Epic:** Frontend Audit Remediation
**Total Estimated Time:** 2-3 weeks
**Total Tasks:** 43 tasks across 4 phases

---

## Phase 1: Critical Accessibility & Touch Targets (Week 1)

**Goal:** Fix all WCAG AA violations, kiosk touch targets, and critical accessibility issues

### T1.1 - Install Lucide React Icon Library
- **Effort:** Small (2-4 hours)
- **Dependencies:** None
- **Acceptance Criteria:**
  - lucide-react installed in shared/ui/package.json
  - Central icon exports in shared/ui/icons.ts
  - 10+ commonly used icons exported
  - Documentation on icon usage patterns
- **Files:** shared/ui/package.json, shared/ui/icons.ts

### T1.2 - Fix WCAG AA Contrast Violations
- **Effort:** Medium (1 day)
- **Dependencies:** None
- **Acceptance Criteria:**
  - All color combinations meet 4.5:1 contrast ratio
  - tokens.ts updated with accessible colors
  - Automated contrast checker utility created
  - CI test fails if contrast violations introduced
- **Files:** shared/ui/tokens.ts, shared/ui/theme.css, shared/ui/contrast-test.ts

### T1.3 - Create Accessible Badge Component
- **Effort:** Medium (1 day)
- **Dependencies:** T1.1, T1.2
- **Acceptance Criteria:**
  - Badge never relies on color alone
  - Icon support integrated
  - ARIA labels on all badges
  - Multiple visual cues (icon + text + color)
  - Unit tests for accessibility
- **Files:** shared/ui/components/Badge.tsx, shared/ui/components/Badge.test.tsx

### T1.4 - Implement Focus-Visible Styles
- **Effort:** Medium (1 day)
- **Dependencies:** T1.2
- **Acceptance Criteria:**
  - 2px focus ring on all interactive elements
  - High contrast focus color defined
  - Keyboard navigation fully visible
  - Works across all three interfaces
- **Files:** shared/ui/theme.css, shared/ui/tokens.ts

### T1.5 - Increase Kiosk Touch Targets to 56px
- **Effort:** Medium (1 day)
- **Dependencies:** None
- **Acceptance Criteria:**
  - All buttons min 56px height and width
  - Touch targets verified on actual 10.1" touchscreen
  - Spacing adjusted to prevent accidental taps
  - Documentation updated
- **Files:** shared/ui/tokens.ts, kiosk/src/screens/*.tsx (5 files)

### T1.6 - Add Comprehensive ARIA Labels
- **Effort:** Large (2 days)
- **Dependencies:** None
- **Acceptance Criteria:**
  - All tables have proper ARIA attributes
  - Complex controls have ARIA labels
  - Semantic HTML used throughout
  - Screen reader tested with NVDA
- **Files:** frontend/src/pages/*.tsx (6 files)

**Phase 1 Total:** 6 tasks, ~1 week

---

## Phase 2: Visual Design System Overhaul (Week 1-2)

**Goal:** Implement icon library, redesign stats cards, establish typography hierarchy

### T2.1 - Create StatsCard Component
- **Effort:** Medium (1 day)
- **Dependencies:** T1.1, T1.2, T1.3
- **Acceptance Criteria:**
  - Filled background variants (success, neutral, info)
  - Icon prop support
  - Loading skeleton state
  - ARIA labels for screen readers
  - Responsive on mobile
- **Files:** shared/ui/components/StatsCard.tsx, shared/ui/components/StatsCard.test.tsx

### T2.2 - Establish Typography Hierarchy
- **Effort:** Medium (1 day)
- **Dependencies:** T1.2
- **Acceptance Criteria:**
  - Typography scale documented (h1-h6, body, caption)
  - Utility classes created
  - Usage patterns documented
  - Applied consistently across all interfaces
- **Files:** shared/ui/typography.css, shared/ui/tokens.ts

### T2.3 - Replace Emoji Icons with Lucide
- **Effort:** Medium (1 day)
- **Dependencies:** T1.1, T2.2
- **Acceptance Criteria:**
  - All emojis removed from codebase
  - Lucide icons used consistently
  - Icon sizes standardized
  - Color usage consistent
- **Files:** frontend/src/pages/*.tsx, kiosk/src/screens/*.tsx, tv-display/src/components/*.tsx (10+ files)

### T2.4 - Redesign Dashboard Stats Cards
- **Effort:** Small (4 hours)
- **Dependencies:** T2.1, T2.3
- **Acceptance Criteria:**
  - Present = green background
  - Absent = gray background
  - Visitors = blue background
  - Total = neutral background
  - Icons added to each card
  - Loading states implemented
- **Files:** frontend/src/pages/Dashboard.tsx

### T2.5 - Create Consistent Badge Color System
- **Effort:** Medium (1 day)
- **Dependencies:** T1.3
- **Acceptance Criteria:**
  - Semantic badge variants defined
  - Documentation created
  - All badge usage updated
  - Color meanings clear without color
- **Files:** shared/ui/components/Badge.tsx, docs/design-system/badge-usage.md

### T2.6 - Redesign Reports Stats Cards
- **Effort:** Small (4 hours)
- **Dependencies:** T2.1, T2.4
- **Acceptance Criteria:**
  - Matches Dashboard style
  - Icons added
  - Visual hierarchy improved
  - Loading states added
- **Files:** frontend/src/pages/Reports.tsx

### T2.7 - Redesign TV Display Presence Stats
- **Effort:** Medium (1 day)
- **Dependencies:** T2.1, T2.2
- **Acceptance Criteria:**
  - Larger text for wall display viewing
  - Color-coded backgrounds
  - Better contrast
  - Icons added
- **Files:** tv-display/src/components/PresenceCards.tsx, tv-display/src/pages/PresenceView.tsx

**Phase 2 Total:** 7 tasks, ~1 week

---

## Phase 3: UX Enhancements (Week 2)

**Goal:** Add sorting, filtering, search, pagination, confirmations, loading states

### T3.1 - Create DataTable Component
- **Effort:** Large (2 days)
- **Dependencies:** T1.6, T2.2
- **Acceptance Criteria:**
  - Sortable columns with ARIA
  - Hover states
  - Proper semantic HTML
  - Column header component
  - Reusable across all admin pages
- **Files:** shared/ui/components/DataTable.tsx, shared/ui/components/DataTable.test.tsx, shared/ui/components/TableColumn.tsx

### T3.2 - Add Pagination to DataTable
- **Effort:** Medium (1 day)
- **Dependencies:** T3.1
- **Acceptance Criteria:**
  - Accessible controls
  - Page info display
  - Configurable page sizes
  - Total count shown
  - URL state preserved
- **Files:** shared/ui/components/DataTable.tsx, shared/ui/components/Pagination.tsx

### T3.3 - Create LoadingSkeleton Components
- **Effort:** Medium (1 day)
- **Dependencies:** None
- **Acceptance Criteria:**
  - Table skeleton
  - Card skeleton
  - List skeleton
  - Pulse animation
  - Respects prefers-reduced-motion
- **Files:** shared/ui/components/LoadingSkeleton.tsx, shared/ui/components/TableSkeleton.tsx, shared/ui/components/CardSkeleton.tsx

### T3.4 - Create EmptyState Component
- **Effort:** Small (4 hours)
- **Dependencies:** T1.1
- **Acceptance Criteria:**
  - Icon, heading, description, action
  - Multiple variants (no-data, no-results, error)
  - Responsive
  - Accessible
- **Files:** shared/ui/components/EmptyState.tsx

### T3.5 - Create ConfirmDialog Component
- **Effort:** Medium (1 day)
- **Dependencies:** T1.4
- **Acceptance Criteria:**
  - Danger/warning/neutral variants
  - Focus trap
  - Keyboard navigation (ESC, Enter)
  - ARIA attributes
  - Unit tests
- **Files:** shared/ui/components/ConfirmDialog.tsx, shared/ui/components/ConfirmDialog.test.tsx

### T3.6 - Create SearchBar Component
- **Effort:** Medium (1 day)
- **Dependencies:** T1.6
- **Acceptance Criteria:**
  - Debounced input
  - Clear button
  - Keyboard shortcuts (Cmd+K)
  - ARIA live region
  - Results count announced
- **Files:** shared/ui/components/SearchBar.tsx, shared/ui/hooks/useDebounce.ts

### T3.7 - Integrate DataTable in Members Page
- **Effort:** Medium (1 day)
- **Dependencies:** T3.1, T3.2, T3.3
- **Acceptance Criteria:**
  - Sorting on all columns
  - Pagination working
  - Hover states visible
  - Loading skeletons shown
  - No regressions in functionality
- **Files:** frontend/src/pages/Members.tsx

### T3.8 - Add Delete Confirmation to Members
- **Effort:** Small (4 hours)
- **Dependencies:** T3.5, T3.7
- **Acceptance Criteria:**
  - Confirmation modal before delete
  - Bulk actions functional
  - Member count displayed
  - Filter chips shown
- **Files:** frontend/src/pages/Members.tsx

### T3.9 - Redesign Visitors Page Tabs
- **Effort:** Medium (1 day)
- **Dependencies:** T3.1, T3.6
- **Acceptance Criteria:**
  - "Currently Signed In" and "History" tabs
  - Search functionality
  - Date range filter
  - DataTable integrated
- **Files:** frontend/src/pages/Visitors.tsx, frontend/src/components/DateRangePicker.tsx

### T3.10 - Add Sign-Out Confirmation
- **Effort:** Small (4 hours)
- **Dependencies:** T3.5, T3.9
- **Acceptance Criteria:**
  - Modal confirms before sign-out
  - Button color fixed (neutral)
  - Visitor count badges on tabs
  - User-friendly messaging
- **Files:** frontend/src/pages/Visitors.tsx

### T3.11 - Add Search to Events Page
- **Effort:** Medium (1 day)
- **Dependencies:** T3.1, T3.6
- **Acceptance Criteria:**
  - Search by name or code
  - Complete filter controls
  - DataTable integrated
  - Event count displayed
- **Files:** frontend/src/pages/Events.tsx

### T3.12 - Add Search to Settings Page
- **Effort:** Small (4 hours)
- **Dependencies:** T3.1, T3.5, T3.6
- **Acceptance Criteria:**
  - Search functionality
  - DataTable integrated
  - Tab naming fixed
  - Delete confirmation
- **Files:** frontend/src/pages/Settings.tsx

### T3.13 - Add Date Picker and Chart to Reports
- **Effort:** Large (2 days)
- **Dependencies:** T3.9
- **Acceptance Criteria:**
  - Date range picker functional
  - Attendance trend chart
  - Report timestamp shown
  - Export options (CSV, PDF)
- **Files:** frontend/src/pages/Reports.tsx, frontend/src/components/AttendanceChart.tsx

### T3.14 - Add Loading States to Stats Cards
- **Effort:** Small (4 hours)
- **Dependencies:** T2.1, T3.3
- **Acceptance Criteria:**
  - Skeletons shown during fetch
  - Smooth transition to data
  - Works on Dashboard and Reports
- **Files:** frontend/src/pages/Dashboard.tsx, frontend/src/pages/Reports.tsx

### T3.15 - Add Empty States to All Tables
- **Effort:** Medium (1 day)
- **Dependencies:** T3.4, T3.7
- **Acceptance Criteria:**
  - Empty states on Members, Visitors, Events, Settings
  - Appropriate messaging
  - Action buttons where applicable
- **Files:** frontend/src/pages/*.tsx (4 files)

**Phase 3 Total:** 15 tasks, ~2 weeks

---

## Phase 4: Polish & Responsive (Week 2-3)

**Goal:** Mobile responsive, animations, branding, final QA

### T4.1 - Add Mobile Hamburger Menu
- **Effort:** Medium (1 day)
- **Dependencies:** T2.3
- **Acceptance Criteria:**
  - Drawer navigation on mobile
  - Smooth transitions
  - Focus management
  - Keyboard accessible
- **Files:** frontend/src/components/Sidebar.tsx, frontend/src/components/MobileNav.tsx

### T4.2 - Make Tables Responsive
- **Effort:** Medium (1 day)
- **Dependencies:** T3.1
- **Acceptance Criteria:**
  - Horizontal scroll on mobile
  - Sticky column headers
  - Touch-optimized
  - No layout breaks < 375px
- **Files:** shared/ui/components/DataTable.tsx, shared/ui/theme.css

### T4.3 - Optimize Kiosk Landscape Layout
- **Effort:** Medium (1 day)
- **Dependencies:** T1.5
- **Acceptance Criteria:**
  - Tested on 10.1" touchscreen
  - Spacing optimized
  - No scrolling required
  - Touch targets verified
- **Files:** kiosk/src/screens/*.tsx (2 files), kiosk/src/App.css

### T4.4 - Improve Kiosk Network Indicator
- **Effort:** Small (4 hours)
- **Dependencies:** T1.2, T1.3
- **Acceptance Criteria:**
  - Text label added
  - Size increased
  - Better positioning
  - Accessible to color-blind users
- **Files:** kiosk/src/components/NetworkIndicator.tsx

### T4.5 - Fix TV Display ActivityFeed
- **Effort:** Medium (1 day)
- **Dependencies:** T2.2, T2.7
- **Acceptance Criteria:**
  - Cramped layout fixed
  - Text truncation prevented
  - Spacing improved
  - Contrast enhanced
- **Files:** tv-display/src/components/ActivityFeed.tsx, tv-display/src/App.css

### T4.6 - Add Micro-Transitions
- **Effort:** Medium (1 day)
- **Dependencies:** None
- **Acceptance Criteria:**
  - Button hover transitions
  - Card elevation changes
  - Drawer open/close animations
  - Respects prefers-reduced-motion
- **Files:** shared/ui/theme.css, shared/ui/animations.css

### T4.7 - Add Error Boundaries
- **Effort:** Medium (1 day)
- **Dependencies:** None
- **Acceptance Criteria:**
  - All three apps wrapped
  - User-friendly error messages
  - Recovery actions provided
  - Error reporting integrated
- **Files:** shared/ui/components/ErrorBoundary.tsx, frontend/src/App.tsx, kiosk/src/App.tsx, tv-display/src/App.tsx

### T4.8 - Add Branding Elements
- **Effort:** Small (4 hours)
- **Dependencies:** None
- **Acceptance Criteria:**
  - Logo component created
  - Added to all interfaces
  - Unit crest on TV display
  - Multiple size variants
- **Files:** shared/ui/components/Logo.tsx, frontend/src/layouts/DashboardLayout.tsx, kiosk/src/screens/IdleScreen.tsx, tv-display/src/App.tsx

### T4.9 - Add Skip Nav and ARIA Landmarks
- **Effort:** Small (4 hours)
- **Dependencies:** T1.6
- **Acceptance Criteria:**
  - Skip navigation link
  - ARIA landmarks
  - Proper heading hierarchy
  - Keyboard accessible
- **Files:** frontend/src/layouts/DashboardLayout.tsx, shared/ui/components/SkipNav.tsx

### T4.10 - Final Accessibility QA
- **Effort:** Large (2 days)
- **Dependencies:** T1.2, T1.3, T1.4, T1.6, T4.9
- **Acceptance Criteria:**
  - axe-core tests pass 100%
  - WAVE scan shows zero errors
  - Manual keyboard testing complete
  - Screen reader tested (NVDA, VoiceOver)
  - Results documented
- **Files:** tests/accessibility/*.spec.ts, docs/accessibility-audit.md

### T4.11 - Responsive Testing
- **Effort:** Medium (1 day)
- **Dependencies:** T4.1, T4.2
- **Acceptance Criteria:**
  - Tested on iOS and Android
  - Tablet breakpoints verified
  - No horizontal scroll issues
  - Touch targets verified
- **Files:** shared/ui/theme.css, tests/responsive/*.spec.ts

### T4.12 - Kiosk Hardware Testing
- **Effort:** Medium (1 day)
- **Dependencies:** T1.5, T4.3, T4.6
- **Acceptance Criteria:**
  - Tested on Raspberry Pi 5
  - 10.1" touchscreen verified
  - Performance acceptable
  - Animations smooth
  - Results documented
- **Files:** docs/hardware-testing.md, kiosk/src/App.css

**Phase 4 Total:** 12 tasks, ~2 weeks

---

## Summary

**Total Tasks:** 43
**Total Effort:** 2-3 weeks with parallel execution

### Breakdown by Effort:
- Small (4-8 hours): 15 tasks
- Medium (1 day): 22 tasks
- Large (2 days): 6 tasks

### Breakdown by Phase:
- Phase 1 (Critical): 6 tasks (~1 week)
- Phase 2 (Visual): 7 tasks (~1 week)
- Phase 3 (UX): 15 tasks (~2 weeks)
- Phase 4 (Polish): 12 tasks (~2 weeks)

### Parallel Execution Opportunities:
- Phase 1: T1.1 + T1.2 + T1.5 can run in parallel (3 programmers)
- Phase 2: T2.1 + T2.2 + T2.5 can run in parallel (3 programmers)
- Phase 3: T3.3 + T3.4 + T3.5 + T3.6 can run in parallel (4 programmers)
- Phase 4: T4.1 + T4.3 + T4.6 + T4.7 + T4.8 can run in parallel (5 programmers)

### Critical Path:
T1.2 → T1.3 → T2.1 → T2.4 → T3.1 → T3.7 → T4.2 → T4.10

**Recommended Team Size:** 2-3 programmers
**Recommended Schedule:** 3 weeks with aggressive parallelization, 4 weeks for safety buffer

---

## Monday.com Import Format

For each task above, create Monday.com items with:
- **Name:** Task ID + Description (e.g., "T1.1 - Install Lucide React Icon Library")
- **Status:** Not Started
- **Priority:** Critical (Phase 1), High (Phase 2), Medium (Phase 3), Low (Phase 4)
- **Effort:** S/M/L
- **Dependencies:** Listed task IDs
- **Assignee:** TBD
- **Labels:** Phase tag (Phase 1, Phase 2, Phase 3, Phase 4) + Interface tag (Admin, Kiosk, TV, Shared)
- **Files:** List of affected files in description
- **Acceptance Criteria:** Checklist in description

---

## Notes

- All tasks assume Bun package manager (not npm)
- HeroUI Pro license in place for admin dashboard
- Target browsers: Chrome 120+, Safari 17+, Firefox 120+
- Light mode only (no dark theme)
- Hardware testing required on Raspberry Pi 5 with 10.1" capacitive touchscreen
- WCAG AA compliance mandatory before deployment
