# Sentinel Frontend Audit Remediation - Implementation Plan

**Status:** Ready for Implementation
**Created:** November 28, 2025
**Estimated Duration:** 2-3 weeks
**Total Tasks:** 43 across 4 phases

---

## Quick Links

- **[Epic Plan (YAML)](./epic-plan.yaml)** - Complete implementation plan in pdocs format
- **[Monday.com Tasks](./monday-tasks.md)** - Task breakdown for project tracking
- **[Audit Report](../../FRONTEND-AUDIT-REPORT.md)** - Original audit findings

---

## Overview

Comprehensive remediation of all frontend issues identified in the Sentinel Frontend Audit Report. Upgrades three React interfaces (Admin Dashboard, Kiosk, TV Display) from Grade B- to Grade A with full WCAG AA compliance, professional visual design, and excellent UX.

### Current State
- **Admin Dashboard:** B- (functional but needs polish)
- **Kiosk Interface:** B- (functional but accessibility issues)
- **TV Display:** B (best of three, minor improvements needed)

### Target State
- **All Interfaces:** A (production-ready for CAF deployment)
- **WCAG AA:** 100% compliance
- **Visual Design:** Professional, consistent, polished
- **UX:** Sorting, filtering, search, pagination on all tables
- **Mobile:** Fully responsive across all devices
- **Accessibility:** Keyboard and screen reader accessible

---

## Phased Approach

### ✅ Phase 1: Critical Accessibility & Touch Targets (Week 1)

**Priority:** CRITICAL - Must fix before deployment

**Tasks:** 6 tasks, ~1 week effort

**Goals:**
- Fix ALL WCAG AA contrast violations (4.5:1 minimum)
- Increase kiosk touch targets from 48px to 56px
- Add comprehensive ARIA labels
- Implement focus-visible styles for keyboard nav
- Create accessible badge system (never rely on color alone)

**Key Deliverables:**
- Lucide React icon library installed
- Contrast violations eliminated
- Accessible Badge component
- Focus indicators on all interactive elements
- Kiosk buttons 56px minimum
- ARIA labels on complex controls

**Acceptance Criteria:**
- axe-core automated tests pass
- All touch targets verified on 10.1" touchscreen
- Keyboard navigation fully functional
- Badge colors not sole indicator of meaning

---

### 🎨 Phase 2: Visual Design System Overhaul (Week 1-2)

**Priority:** HIGH - Professional appearance required

**Tasks:** 7 tasks, ~1 week effort

**Goals:**
- Replace emoji icons with Lucide React icons
- Redesign stats cards with filled backgrounds
- Establish typography hierarchy
- Create consistent badge color system
- Color-code stats (Present=green, Absent=gray, Visitors=blue)

**Key Deliverables:**
- StatsCard component with filled backgrounds
- Typography scale documented
- All emoji icons replaced with SVG
- Dashboard stats cards redesigned
- Reports stats cards redesigned
- TV Display presence stats enlarged

**Acceptance Criteria:**
- Zero emoji icons in codebase
- Stats cards use semantic colors
- Typography hierarchy enforced
- Icons on all navigation and stats
- TV Display optimized for wall display viewing

---

### 🚀 Phase 3: UX Enhancements (Week 2)

**Priority:** MEDIUM - Excellent UX required

**Tasks:** 15 tasks, ~2 weeks effort

**Goals:**
- Add sorting, filtering, pagination to all tables
- Implement search on all list pages
- Add confirmation dialogs for destructive actions
- Create loading skeletons and empty states
- Improve error handling

**Key Deliverables:**
- Reusable DataTable component
- Pagination component
- LoadingSkeleton components
- EmptyState component
- ConfirmDialog component
- SearchBar component with Cmd+K shortcut
- Members, Visitors, Events, Settings pages enhanced
- Reports page with date picker and chart

**Acceptance Criteria:**
- All tables sortable by clicking columns
- Pagination on tables with 10+ rows
- Search on 100% of list pages
- Confirmation before delete/sign-out
- Loading skeletons during data fetch
- Empty states when no data

---

### ✨ Phase 4: Polish & Responsive (Week 2-3)

**Priority:** LOW - Nice-to-have polish

**Tasks:** 12 tasks, ~2 weeks effort

**Goals:**
- Mobile responsive across all devices
- Kiosk landscape optimization
- TV Display improvements
- Micro-interactions and transitions
- Branding elements
- Final QA pass

**Key Deliverables:**
- Mobile hamburger menu
- Responsive tables (horizontal scroll)
- Kiosk landscape layout optimized
- Network indicator improved
- ActivityFeed layout fixed
- Micro-transitions (respecting prefers-reduced-motion)
- Error boundaries on all apps
- Logo and branding
- Skip navigation and ARIA landmarks
- Final accessibility audit
- Responsive testing
- Hardware testing on Raspberry Pi

**Acceptance Criteria:**
- Mobile menu functional < 768px
- All tables responsive
- Kiosk verified on 10.1" touchscreen
- Transitions smooth on Raspberry Pi
- Error boundaries catch failures
- 100% accessibility compliance
- All devices tested (iOS, Android, tablets)

---

## Task Dependencies & Critical Path

### Critical Path (Sequential)
```
T1.2 (Contrast Fixes)
  ↓
T1.3 (Accessible Badge)
  ↓
T2.1 (StatsCard Component)
  ↓
T2.4 (Dashboard Stats)
  ↓
T3.1 (DataTable Component)
  ↓
T3.7 (Members Page)
  ↓
T4.2 (Responsive Tables)
  ↓
T4.10 (Final Accessibility QA)
```

### Parallelizable Workstreams

**Phase 1:**
- Stream A: T1.1 (Icons) → T1.3 (Badge) → T1.4 (Focus)
- Stream B: T1.2 (Contrast) → T1.6 (ARIA)
- Stream C: T1.5 (Touch Targets)

**Phase 2:**
- Stream A: T2.1 (StatsCard) → T2.4 (Dashboard) → T2.6 (Reports)
- Stream B: T2.2 (Typography) → T2.7 (TV Display)
- Stream C: T2.3 (Replace Icons) + T2.5 (Badge System)

**Phase 3:**
- Stream A: T3.1 (DataTable) → T3.2 (Pagination) → T3.7 (Members)
- Stream B: T3.3 (Skeleton) + T3.4 (Empty) + T3.5 (Confirm) + T3.6 (Search)
- Stream C: T3.9 (Visitors) → T3.10 (Confirm)
- Stream D: T3.11 (Events) + T3.12 (Settings)
- Stream E: T3.13 (Reports Chart) + T3.14 (Loading) + T3.15 (Empty)

**Phase 4:**
- Stream A: T4.1 (Mobile Nav) → T4.11 (Responsive Test)
- Stream B: T4.3 (Kiosk) → T4.12 (Hardware Test)
- Stream C: T4.6 (Transitions) + T4.7 (Error) + T4.8 (Branding)
- Stream D: T4.4 (Network) + T4.5 (ActivityFeed) + T4.9 (Skip Nav)
- Stream E: T4.10 (Accessibility QA) - MUST RUN LAST

---

## Resource Requirements

### Team Composition

**Minimum:** 2 programmers
**Optimal:** 3 programmers
**Maximum Parallelization:** 5 programmers (Phase 4)

### Skills Required

- React 19 + TypeScript expertise
- HeroUI component library experience
- Accessibility (WCAG AA) knowledge
- Responsive design skills
- Lucide React icon familiarity
- Testing (Playwright, axe-core)

### Hardware Requirements

- 10.1" capacitive touchscreen for kiosk testing
- Raspberry Pi 5 (8GB) for hardware verification
- Mobile devices (iOS, Android) for responsive testing
- Desktop browsers (Chrome, Safari, Firefox)

---

## Success Metrics

### Accessibility
- ✅ 100% WCAG AA compliance (automated axe-core tests)
- ✅ Zero contrast violations below 4.5:1
- ✅ All interactive elements keyboard accessible
- ✅ Screen reader tested with NVDA and VoiceOver

### UX
- ✅ All tables sortable and paginated
- ✅ Search on 100% of list pages
- ✅ Confirmation dialogs on all destructive actions
- ✅ Loading skeletons on all async operations
- ✅ Empty states on all lists/tables

### Visual Design
- ✅ Consistent badge system across all interfaces
- ✅ Color-coded stats cards (green/gray/blue/neutral)
- ✅ Icons on 100% of navigation and stats
- ✅ Typography hierarchy documented and enforced

### Responsive
- ✅ Mobile hamburger menu on admin dashboard
- ✅ All tables scroll horizontally on mobile
- ✅ Kiosk landscape optimized for 10.1" screen
- ✅ Touch targets 56px minimum on kiosk

### Polish
- ✅ Micro-transitions on interactive elements
- ✅ Error boundaries on all apps
- ✅ Branding elements present
- ✅ User-friendly error messages

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| HeroUI component API changes | Low | High | Pin version, test before upgrading |
| Lucide bundle size impact | Medium | Medium | Tree-shaking, monitor bundle size |
| Raspberry Pi performance issues | Medium | High | Test early (T4.12), optimize animations |
| Breaking functionality during redesign | Medium | High | Incremental migration, comprehensive testing |
| Accessibility regressions | Medium | Critical | Automated tests in CI, manual verification |
| Mobile issues discovered late | Low | Medium | Test mobile early (T4.11) |

---

## Implementation Timeline

### Week 1
- **Phase 1 Complete:** Accessibility fixes (Mon-Wed)
- **Phase 2 Start:** Visual design (Thu-Fri)

### Week 2
- **Phase 2 Complete:** Visual design (Mon-Tue)
- **Phase 3 Start:** UX enhancements (Wed-Fri)

### Week 3
- **Phase 3 Continue:** UX enhancements (Mon-Wed)
- **Phase 4 Start:** Polish & responsive (Thu-Fri)

### Week 4 (Buffer)
- **Phase 4 Complete:** Final QA and testing
- **Deployment:** Production release

---

## Testing Strategy

### Automated Testing
- **Unit Tests:** All new components (Jest + React Testing Library)
- **Accessibility Tests:** axe-core integration (Playwright)
- **Visual Regression:** Screenshot comparison (Playwright)
- **Bundle Size:** Track and alert on increases

### Manual Testing
- **Keyboard Navigation:** Tab through all interfaces
- **Screen Reader:** NVDA (Windows), VoiceOver (macOS)
- **Mobile Devices:** iOS Safari, Android Chrome
- **Hardware:** Raspberry Pi 5 + 10.1" touchscreen
- **Browsers:** Chrome 120+, Safari 17+, Firefox 120+

### Testing Checkpoints
- **Post-Phase 1:** Accessibility audit with axe-core
- **Post-Phase 2:** Visual design review with stakeholders
- **Post-Phase 3:** UX testing with sample users
- **Post-Phase 4:** Full regression testing, hardware verification

---

## Deployment Strategy

### Incremental Rollout

**Option A: Phased Deployment**
1. Deploy Phase 1 (critical fixes) immediately
2. Deploy Phase 2 (visual) after 1 week
3. Deploy Phase 3 (UX) after 2 weeks
4. Deploy Phase 4 (polish) after 3 weeks

**Option B: Full Release**
- Complete all phases before deployment
- Comprehensive QA on staging environment
- Single production release after 3 weeks

**Recommendation:** Option B (full release) to avoid user confusion with incremental UI changes.

### Rollback Plan
- Tag pre-remediation code: `v1.0-pre-audit`
- Feature flags for major changes
- Database migrations backward-compatible
- Monitoring alerts for errors/performance

---

## Next Steps

1. **Review Plan:** Stakeholder approval of scope and timeline
2. **Assign Tasks:** Distribute tasks to programmers based on expertise
3. **Set Up Tracking:** Create Monday.com board with all 43 tasks
4. **Provision Hardware:** Ensure touchscreen and Raspberry Pi available
5. **Branch Strategy:** Create `feat/frontend-audit-remediation` branch
6. **Kickoff Meeting:** Review plan, answer questions, start Phase 1

---

## Contact & Support

**Questions:** Review epic-plan.yaml for detailed implementation specs
**Issues:** Reference FRONTEND-AUDIT-REPORT.md for original findings
**Updates:** Track progress in Monday.com board

---

**Last Updated:** November 28, 2025
**Plan Version:** 1.0
**Next Review:** After Phase 1 completion
