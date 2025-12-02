# Investigation: Frontend Audit Remediation

> **Status:** Investigation Complete
> **Started:** December 1, 2025

## Scope

40 tasks across 4 phases from `docs/REMAINING-TASKS.md`:
- **Phase 1:** Critical Accessibility (6 tasks)
- **Phase 2:** Visual Design (7 tasks)
- **Phase 3:** UX Enhancements (15 tasks)
- **Phase 4:** Polish & Responsive (12 tasks)

## Critical Path

T1.2 → T1.3 → T2.1 → T2.4 → T3.1 → T3.7 → T4.2 → T4.10

## Phase 1 Task Status After Investigation

| ID | Task | Status | Notes |
|----|------|--------|-------|
| T1.1 | Install Lucide React | ✅ **DONE** | Already installed via `@shared/ui/icons.ts` with 50+ icons |
| T1.2 | Fix WCAG AA contrast | ⚠️ **PARTIAL** | tokens.ts has #0066cc (4.53:1), but theme.css still has #007fff |
| T1.3 | Accessible Badge component | ✅ **DONE** | Badge.tsx already WCAG AA compliant with 13 variants |
| T1.4 | Focus-visible styles | 🔧 **NEEDED** | Focus ring uses #007fff (3.68:1) - needs #0066cc |
| T1.5 | Kiosk touch targets 56px | ✅ **DONE** | All buttons have `min-h-[56px] min-w-[56px]` |
| T1.6 | ARIA labels | 🔧 **NEEDED** | Frontend 55%, Kiosk 19%, TV 4% coverage |

## Investigation Findings

### T1.1: Icon Usage - ✅ ALREADY COMPLETE

**Lucide already installed** via `shared/ui/icons.ts` - 50+ icons exported.

**Files needing Iconify → Lucide migration (2 files, ~18 instances):**
- `frontend/src/components/ImportModal.tsx` - 8 solar:* icons
- `frontend/src/components/MobileNav.tsx` - 6 solar:* icons (via nav-items.tsx)

**Kiosk inline SVGs to consider (2 files):**
- `kiosk/src/screens/SuccessScreen.tsx` - checkmark SVG
- `kiosk/src/screens/ErrorScreen.tsx` - X SVG

### T1.2: Color Contrast Issues

**Primary color conflict:**
- `tokens.ts:21` defines #0066cc (4.53:1) ✅
- `theme.css` still uses #007fff (3.68:1) ❌

**Orange accent #ff8000** - 3.54:1 as text - needs dark background pairing

**All badge colors verified compliant** (6.37:1 to 7.15:1)

### T1.3: Badge Component - ✅ ALREADY COMPLETE

`shared/ui/components/Badge.tsx`:
- 13 semantic variants
- 3 sizes (sm, md, lg)
- WCAG AA compliant colors
- `role="status"`, icons `aria-hidden`

### T1.4: Focus-Visible Styles

**Issue:** `theme.css:122` and `tokens.ts:346` use #007fff for focus ring
**Fix:** Update to #0066cc for 4.5:1 contrast

### T1.5: Kiosk Touch Targets - ✅ ALREADY COMPLETE

All buttons in `kiosk/src/styles/global.css:98-156`:
- `.kiosk-button-primary`: `min-h-[56px] min-w-[56px]`
- `.kiosk-button-secondary`: `min-h-[56px] min-w-[56px]`
- `.kiosk-button-danger`: `min-h-[56px] min-w-[56px]`
- `.kiosk-input`: `min-h-[56px]`

### T1.6: ARIA Labels Audit

| App | Coverage | Status |
|-----|----------|--------|
| Frontend | 55% | Good foundation |
| Kiosk | 19% | Critical gaps |
| TV Display | 4% | Needs work |

**Critical fixes:**
- Kiosk `IdleScreen.tsx:57-69` - 2 buttons missing aria-labels
- Kiosk `DevPanel.tsx:174-204` - 4 action buttons missing aria-labels
- TV `ScrollView.tsx` - Fix heading hierarchy (h3→h2), add `role="region"`, `aria-live="polite"`

## Revised Phase 1 Work

| Task | Effort | Parallel Group |
|------|--------|----------------|
| Migrate Iconify → Lucide (2 files) | 2 hrs | A |
| Fix primary color #007fff → #0066cc | 1 hr | A |
| Fix focus ring color | 30 min | A |
| Add ARIA labels - Kiosk | 2 hrs | B |
| Add ARIA labels - TV Display | 1 hr | B |
| Add ARIA labels - Frontend refinement | 2 hrs | B |

**Total revised effort: ~8 hours** (down from 6+ days original estimate)
