# Sentinel Design System

Quick reference for Sentinel's UI specifications. For visual examples, see `docs/design-document.html`.

## Files

| File | Contents | Lines |
|------|----------|-------|
| `tokens.md` | Colors, typography, spacing, shadows | ~180 |
| `components.md` | Buttons, forms, cards, tables, status | ~250 |
| `layouts.md` | Admin, TV, Kiosk, Scanner interfaces | ~200 |

## Key Constraints

- **Light mode only** - No dark theme
- **WCAG AA** - 4.5:1 contrast minimum
- **Touch targets** - 48px minimum, 56px for kiosk
- **Offline-first** - Kiosk works without network
- **Non-technical admins** - Plain language errors

## Quick Reference

### Primary Colors
- Blue: `#007fff` (primary actions, focus)
- Orange: `#ff8000` (accent, visitors)
- Green: `#10b981` (success, present)
- Red: `#ef4444` (error, danger)

### Touch Target Sizes
| Context | Size |
|---------|------|
| Desktop minimum | 40px |
| WCAG AA minimum | 48px |
| Kiosk default | 56px |

### Interface Modes
```css
.kiosk-mode  /* 56px targets, larger fonts */
.tv-mode     /* No hover, no cursor, passive */
```

### Font Stack
```css
--font-sans: 'Inter', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', monospace;
```

## Source of Truth

`heroui-theme-config.ts` contains the complete theme configuration for HeroUI/Tailwind integration.
