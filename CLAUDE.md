# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RFID attendance tracking system for **HMCS Chippawa** (Royal Canadian Navy reserve unit, Winnipeg). Standalone system - no DWAN integration.

## Hardware Deployment

| System | Hardware | Display |
|--------|----------|---------|
| Backend Server | Raspberry Pi 5 (8GB) | None |
| Primary Entrance Kiosk | Pi 5 + Waveshare PN532 NFC HAT | 10.1" Capacitive Touchscreen |
| Rear Door Scanner | Pi 5 + PN532 NFC HAT | None (audio only) |

## Critical Constraints

- **Light mode only** - No dark theme implementation
- **WCAG AA required** - 4.5:1 contrast ratio minimum
- **Touch targets 48px minimum** - Kiosk uses 56px
- **Reduced animations on Pi** - Use `prefers-reduced-motion` media query
- **Offline-first** - All kiosk operations must work without network
- **Admins are non-technical** - Plain language errors with "how to fix" guidance

## Member Classifications

Three distinct types - never mix in queries:
1. **Full-Time Staff** - Class B/C personnel
2. **Reserve Members** - Class A personnel
3. **Event Attendees** - Temporary access tied to events (separate data model)

## Design Tokens

Primary: `#007fff` (Azure Blue)
Accent: `#ff8000` (Orange)
Font: Inter

Use `heroui-theme-config.ts` for all color/spacing values - single source of truth.

## Project Name
Sentinel - RFID attendance tracking system

## UI Mode Classes

```css
.kiosk-mode  /* 56px touch targets, larger fonts */
.tv-mode     /* 10-foot UI, no hover states, cursor: default */
```

## Key Technologies

- HeroUI Pro (Application Pack) - use base primitives for kiosk/TV, Pro components for admin
- Tailwind CSS with HeroUI plugin
- React + TypeScript
- Bun (not npm)

## Interface-Specific Rules

| Interface | HeroUI Pro Components | Custom Components |
|-----------|----------------------|-------------------|
| Admin Dashboard | Full Pro suite | Minimal |
| Kiosk | Base primitives only | All layouts |
| TV Display | KPI Stats (enlarged) | All layouts |
| Rear Door | None | Audio feedback |

## Documentation Files

- `product-overview.html` - Requirements and user flows
- `docs/design-document.html` - Complete design system (visual reference for humans)
- `design-system/` - Modular specs for Claude Code:
  - `README.md` - Index and quick reference
  - `tokens.md` - Colors, typography, spacing
  - `components.md` - Buttons, forms, cards, tables
  - `layouts.md` - Admin, TV, kiosk interfaces
- `heroui-component-mapping.md` - Component selection guide
- `heroui-dashboard-templates.md` - Admin UI wireframes
- `feature-events-groups.md` - Events/temporary access spec
