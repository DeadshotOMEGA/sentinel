# Interface Layouts

Sentinel has 4 distinct interfaces with different requirements.

## Admin Dashboard

Standard desktop web app with sidebar navigation.

### Structure
```
┌─────────────┬──────────────────────────────────┐
│  Sidebar    │  Header (breadcrumbs, search)    │
│  240px      ├──────────────────────────────────┤
│             │                                  │
│  - Logo     │  Content Area                    │
│  - Nav      │  (max 1440px, centered)          │
│  - User     │                                  │
└─────────────┴──────────────────────────────────┘
```

### CSS Classes
- `.layout-sidebar` - Flex container
- `.sidebar` - Fixed left, 240px
- `.layout-main` - Content with left margin
- `.layout-content` - Padding xl

### Components Used
- HeroUI Pro: Sidebar With Sections, Table With Filters, KPI Stats
- Standard inputs, buttons, modals

### Constraints
- Light mode only
- 4.5:1 contrast ratio minimum
- Clear error messages with "how to fix" guidance

---

## TV Display

Passive display for wall-mounted screens. No interaction.

### Structure
```
┌──────────────────────────────────────────────────┐
│  SENTINEL                         14:32:45       │
│  Attendance Dashboard             Monday, Nov 25 │
├──────────────────────────────────────────────────┤
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐    │
│  │   47   │ │   12   │ │    3   │ │    2   │    │
│  │Present │ │ Absent │ │Visitors│ │  Late  │    │
│  └────────┘ └────────┘ └────────┘ └────────┘    │
│                                                  │
│  Recent Activity        │  Present Members       │
│  ─────────────────────  │  ──────────────────    │
│  • J. Smith  09:42      │  ┌──────┐ ┌──────┐    │
│  • M. Lee    09:38      │  │ JD   │ │ ML   │    │
│  ...                    │  └──────┘ └──────┘    │
└──────────────────────────────────────────────────┘
```

### CSS Classes
- `.tv-view` - Full viewport, light gray background
- `.tv-header` - Logo + clock/date
- `.tv-stats-grid` - 4-column KPI cards
- `.tv-stat-card` - White card, 5rem stat value
- `.tv-presence-grid` - Auto-fill employee cards
- `.tv-feed` - Activity list

### Mode Class
Add `.tv-mode` to root:
```css
.tv-mode * {
  cursor: default !important;
}
```

### Constraints
- No hover states (passive viewing)
- Large fonts: 5rem stats, 1.5rem labels
- Auto-refresh via WebSocket
- High contrast for viewing distance

---

## Kiosk Interface (Touchscreen)

Primary entrance terminal with NFC reader. Full touch support.

### Structure
```
┌──────────────────────────────────────────────────┐
│                     SENTINEL                     │
│                      09:42                       │
│                   Monday, Nov 25                 │
│                                                  │
│              ┌────────────────────┐              │
│              │                    │              │
│              │   ◯ Tap Your Badge │              │
│              │                    │              │
│              │   [Visitor Sign-In]│              │
│              └────────────────────┘              │
│                                                  │
│  ● Online                                        │
└──────────────────────────────────────────────────┘
```

### States

**Idle/Scan Prompt**
- Pulsing NFC icon
- "Tap Your Badge" instruction
- Visitor sign-in button

**Success**
- Green checkmark
- Member name + "Checked In Successfully"
- Time stamp
- Returns to idle after 3 seconds

**Error**
- Red X icon
- Error message
- "Try Again" instruction

**Visitor Sign-In**
- Multi-step form
- Step indicators
- Large 56px inputs
- On-screen keyboard compatible

### CSS Classes
- `.kiosk-view` - Blue gradient background, centered content
- `.kiosk-header` - Logo, time, date
- `.kiosk-scan-prompt` - White card, pulsing icon
- `.kiosk-success` - Green themed feedback
- `.kiosk-error` - Red themed feedback
- `.kiosk-visitor-form` - Form with large inputs
- `.kiosk-input` - 56px height inputs
- `.kiosk-btn` - 56px height buttons

### Mode Class
Add `.kiosk-mode` to root:
```css
.kiosk-mode [data-slot="base"] {
  min-height: 56px;
  font-size: 1.125rem;
}
```

### Touch Targets
- Minimum: 48px (WCAG AA)
- Kiosk default: 56px
- Clear tap feedback

### Offline Support
- `.kiosk-offline-banner` - Yellow bottom banner
- Queue indicator showing pending syncs
- Full operation continues offline

---

## Rear Door Scanner

Audio-only feedback. No display.

### Requirements
- Positive beep: Check-in confirmed
- Negative beep: Unknown badge
- Different tone: Already checked in today

### Hardware
- Raspberry Pi 5
- PN532 NFC HAT
- Speaker (no display)

---

## Responsive Breakpoints

| Breakpoint | Usage |
|------------|-------|
| < 768px | Mobile (not primary target) |
| 768-1024px | Tablet |
| 1024-1440px | Desktop |
| > 1440px | Large screens |

TV and Kiosk interfaces are fixed-layout, not responsive.

---

## Reduced Motion

For Raspberry Pi performance:
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```
