# HeroUI Pro Component Mapping for Sentinel

## Component Inventory Summary

HeroUI Pro Application Pack includes **220+ components** across these categories:

| Category | Components | Relevance to Sentinel |
|----------|------------|--------------------------|
| Application | 90+ | **High** - Core of admin dashboard |
| Charts | 21 | **High** - Metrics display |
| AI | 30 | Low - Not needed |
| Marketing | 45 | Low - Not needed |
| E-commerce | 29 | Low - Not needed |

Plus all **free HeroUI base components** (Table, Modal, Input, Button, etc.)

---

## 1. Component Mapping by Interface

### Admin Dashboard

| Feature | HeroUI Pro Component | Notes |
|---------|---------------------|-------|
| **Layout** | | |
| Main navigation | Sidebar With Sections | Divisions, Members, Reports, Settings |
| Collapsible nav | Sidebar With Toggle Button | Save screen space |
| User menu | Sidebar With User Avatar | Show logged-in admin |
| Top bar | Navigation Headers | Breadcrumbs, search, notifications |
| **Authentication** | | |
| Admin login | Simple Login | Clean, no social buttons needed |
| Session timeout | Centered Login With Two Steps | Re-auth flow |
| **Member Management** | | |
| Member list | Table (base) + Table With Filters (Pro) | Sort, filter, search, pagination |
| Member cards | Cards (Pro) | Grid view alternative |
| Add/edit member | Modal + Forms | Form in modal dialog |
| **Excel Import** | | |
| Upload wizard | Vertical Stepper With Helpers | 4-step process with guidance |
| File drop zone | Custom (use base Dropzone pattern) | Drag-and-drop area |
| Column mapping | Table (base) | Preview columns, map fields |
| Review changes | Table With Filters | Show adds/updates/errors |
| Error display | Feedbacks (Pro) | Inline error guidance |
| **Metrics/Dashboard** | | |
| Presence count | KPI Stats (Pro) | Large numbers: Present, Absent, Visitors |
| Trends | Bars And Circles (Pro) | Attendance over time |
| **Notifications** | | |
| Toast messages | Toast (base) | Success/error feedback |
| Alerts | Feedbacks (Pro) | Persistent warnings |
| **Settings** | | |
| Config forms | Forms (Pro) + base inputs | System settings |
| Divisions setup | Table (base) | Manage divisions |

### Primary Entrance Kiosk (Touchscreen)

| Feature | Component Approach | Notes |
|---------|-------------------|-------|
| Scan prompt | **Custom component** | Large touch targets, 120px+ icons, minimal UI |
| Success state | **Custom component** | Full-screen confirmation, big text |
| Error state | **Custom component** | Clear retry messaging |
| Visitor sign-in | Stepper (simplified) + custom inputs | Large 56px inputs, big buttons |
| Clock display | **Custom component** | Prominent time/date |

**Recommendation**: Use HeroUI base primitives (Button, Input) but build custom kiosk-specific layouts. The Pro components are optimized for desktop, not touch kiosks.

### Rear Door Scanner

**No UI components needed** - Audio feedback only.

### TV Display View

| Feature | Component Approach | Notes |
|---------|-------------------|-------|
| Stats cards | KPI Stats (Pro) - enlarged | 5rem+ font sizes |
| Presence grid | **Custom component** | Simple cards, no interaction |
| Activity feed | **Custom component** | Large text, auto-scroll |
| Clock | **Custom component** | Huge monospace time |

**Recommendation**: TV view should be mostly custom CSS. HeroUI components have hover states and interactions that don't make sense for passive displays.

---

## 2. Base HeroUI Components (Free - Included)

These are the workhorses you'll use throughout:

| Component | Usage in Sentinel |
|-----------|---------------------|
| **Table** | Member list, import preview, reports |
| **Modal** | Add/edit dialogs, confirmations |
| **Button** | All interactive actions |
| **Input** | Forms, search |
| **Select** | Division dropdowns, filters |
| **Checkbox** | Multi-select, settings |
| **Switch** | Toggle settings |
| **Tabs** | Section navigation within pages |
| **Dropdown** | Actions menus |
| **Avatar** | Member initials display |
| **Badge** | Status indicators (Present, Absent) |
| **Chip** | Tags, filters |
| **Progress** | Upload progress, sync status |
| **Spinner** | Loading states |
| **Tooltip** | Help text on hover |
| **Pagination** | Table paging |
| **Breadcrumbs** | Navigation trail |
| **Card** | Content containers |
| **Skeleton** | Loading placeholders |

---

## 3. Pro Components - Priority Usage

### Must-Have (High Value)

1. **Sidebar With Sections** - Admin navigation
2. **Table With Filters** - Member management, import preview
3. **KPI Stats** - Dashboard metrics
4. **Steppers (Vertical With Helpers)** - Excel import wizard
5. **Feedbacks** - Error guidance with "how to fix" messaging

### Nice-to-Have (Accelerators)

1. **Authentication forms** - Polished login screens
2. **Navigation Headers** - Top bar with search/notifications
3. **Cards** - Alternative member display
4. **Bars And Circles** - Attendance trend charts

### Skip (Not Relevant)

- AI components (Prompt Inputs, Playgrounds)
- E-commerce components
- Marketing components (Hero Sections, Pricing, etc.)
- Cookie Consents

---

## 3.5 Events & Temporary Groups Feature

| Feature | HeroUI Component | Notes |
|---------|-----------------|-------|
| **Events Management** | | |
| Events list | Table With Filters | Status, date range, attendee count |
| Create/edit event | Modal + Forms (Pro) | Date pickers, description |
| Event status cards | Cards (Pro) | Active/upcoming/completed |
| **Event Attendees** | | |
| Attendee list | Table With Filters | Filter by role, org, badge status |
| Add attendee | Modal + Forms | Name, rank, organization, role |
| Attendee import | Vertical Stepper With Helpers | Same pattern as nominal roll |
| Badge assignment modal | Modal + custom scanner | Scan-to-assign UX |
| **Event Monitoring** | | |
| Event dashboard | KPI Stats | Present/Away/Pending counts |
| Attendee presence list | Table (base) | Real-time status |
| Event-specific TV view | **Custom component** | Large format display |
| **Badge Management** | | |
| Badge pool list | Table (base) | Available, assigned, lost |
| Badge recovery checklist | Table + Checkbox | Track returns |
| Bulk badge assignment | Modal + Table | Select multiple attendees |

---

## 4. Component Customization Needed

### Touch Target Enlargement (Kiosk)

```css
/* Override for kiosk interfaces */
.kiosk-mode .heroui-button {
  min-height: 56px;
  min-width: 56px;
  font-size: 1.125rem;
}

.kiosk-mode .heroui-input {
  height: 56px;
  font-size: 1.125rem;
}
```

### TV View Scaling

```css
/* Override for TV display */
.tv-mode .kpi-stat-value {
  font-size: 5rem;
}

.tv-mode .kpi-stat-label {
  font-size: 1.5rem;
}
```

### Reduced Animations (Pi Performance)

```css
/* Reduce motion for Raspberry Pi */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 5. Accessibility Notes

HeroUI is built on **React Aria**, which provides:

- Full keyboard navigation
- Screen reader support
- Focus management
- ARIA attributes

This aligns with our WCAG AA requirement. Key considerations:

1. **Color contrast** - Our theme (#007fff on white) meets 4.5:1 ratio
2. **Focus indicators** - HeroUI provides visible focus rings by default
3. **Touch targets** - Need to enlarge for kiosk (44px minimum, we're using 48px+)

---

## Sources

- [HeroUI Pro Components](https://www.heroui.pro/components)
- [HeroUI Documentation](https://www.heroui.com/)
- [HeroUI Pro Changelog](https://feedback.heroui.pro/changelog)
