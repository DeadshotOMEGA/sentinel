# Adaptive TV Display Implementation

## Overview

The TV Display now automatically switches between three display modes based on attendance count:

- **Compact Mode** (≤40 people): Original layout with optimized spacing
- **Dense Mode** (41-80 people): Smaller cards, 8-column grid, slim header bar
- **Scroll Mode** (80+ people): Large count header with continuous auto-scroll

## Files Created

### View Components
- `/src/components/CompactView.tsx` - For ≤40 people
- `/src/components/DenseView.tsx` - For 41-80 people
- `/src/components/ScrollView.tsx` - For 80+ people
- `/src/components/AdaptivePresenceView.tsx` - Orchestrator with hysteresis logic

### Test Component
- `/src/components/AdaptiveModeTest.tsx` - Interactive test interface

## Files Modified

### `/src/pages/PresenceView.tsx`
- Integrated `AdaptivePresenceView` component
- Increased Activity Feed width from 18% to 24%

### `/src/components/PresenceCards.tsx`
- Reduced padding: `px-8 py-6` → `px-6 py-4`
- Reduced min-width: `200px` → `160px`
- Smaller text: `text-6xl` → `text-5xl`

### `/src/components/ActivityFeed.tsx`
- Fixed name truncation with vertical layout
- Time and badge on top row
- Full name on bottom row (wraps if needed)

### `/src/App.tsx`
- Added test mode support via URL parameter

## Testing

### Test Mode (Interactive)
```bash
cd /home/sauk/projects/sentinel/tv-display
bun run dev
```

Visit: `http://localhost:5175/?test=adaptive`

**Test Controls:**
- Slider to adjust count (5-200)
- Quick buttons for testing each mode:
  - Compact (20)
  - Dense (50)
  - Scroll (100)
  - Large (200)

### Production Mode
```bash
bun run dev
```

Visit: `http://localhost:5175/`

Normal operation with real WebSocket data.

## Mode Switching Logic

### Thresholds
- **Switch to Dense**: When count > 40
- **Switch to Scroll**: When count > 80
- **Switch down**: Threshold - 5 (hysteresis prevents flickering)

### Hysteresis Example
```
Compact → Dense: 41 people
Dense → Compact: 35 people (not 40)

Dense → Scroll: 81 people
Scroll → Dense: 75 people (not 80)
```

### Transition
- 300ms fade animation
- Respects `prefers-reduced-motion`

## Mode Details

### Compact Mode (≤40)
- Full-size person cards (~108px height)
- 6-column responsive grid
- Large stats cards (reduced padding)
- Activity feed at 24% width
- All present people visible

### Dense Mode (41-80)
- Compact person cards (~80px height)
- 8-column responsive grid
- Stats as slim header bar (not cards)
- Smaller text and spacing
- Fits ~64 people on screen

### Scroll Mode (80+)
- Prominent count header (8xl text)
- Continuous vertical scroll
- Movie credits style
- Auto-adjusting scroll speed (based on count)
- Pauses briefly on new check-ins
- Seamless loop

## Performance

### Scroll Speed Calculation
```typescript
const scrollDuration = Math.max(30, Math.min(90, totalCount * 0.5))
```

- 80 people: 40s
- 100 people: 50s
- 200 people: 90s (capped)

### Accessibility
- Scroll animation disabled when `prefers-reduced-motion` is set
- Duplicate content uses `aria-hidden="true"`
- Proper semantic HTML structure

## Build & Deploy

```bash
# Type check
bun run tsc --noEmit

# Build for production
bun run build

# Preview production build
bun run preview
```

## Next Steps

Test with real data at HMCS Chippawa to ensure:
1. Mode transitions are smooth
2. Scroll speed is comfortable for reading
3. Activity feed names are fully visible
4. Cards fit properly on actual TV displays
