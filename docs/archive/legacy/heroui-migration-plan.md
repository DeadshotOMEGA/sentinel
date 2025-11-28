# HeroUI + Tailwind v4 Migration Plan

## Executive Summary

Migrate all 3 Sentinel frontend apps to **HeroUI v3** with **Tailwind CSS v4**, creating a unified design system while preserving app-specific needs (kiosk touch targets, TV 10-foot UI).

---

## Current State Analysis

| App | React | Tailwind | HeroUI | Custom Components |
|-----|-------|----------|--------|-------------------|
| frontend | 18.2 | 3.4.0 | v2.2.0 | Sidebar, PageWrapper |
| kiosk | 19.2 | 3.x | None | All screens, button classes |
| tv-display | 18.3 | 3.4.13 | None | All components |

### Key Observations

1. **Frontend** already uses HeroUI v2 extensively (Table, Button, Chip, Input, Modal, Select)
2. **Kiosk** uses raw Tailwind with custom `.kiosk-button-*` component classes
3. **TV Display** uses raw Tailwind with hardcoded large font sizes
4. Shared theme config exists at `heroui-theme-config.ts` but only consumed by frontend

---

## Migration Strategy

### Phase 1: Shared Design System Foundation (shared/)

Create a shared package with:
- `@sentinel/ui` - HeroUI wrapper components with Sentinel defaults
- Unified Tailwind v4 configuration
- Design tokens exported for all apps

```
shared/
├── ui/
│   ├── package.json
│   ├── hero.ts            # Tailwind v4 HeroUI plugin config
│   ├── theme.css          # CSS-first Tailwind v4 config
│   ├── tokens.ts          # Design tokens (colors, spacing)
│   ├── components/        # Sentinel-specific component wrappers
│   │   ├── Button.tsx     # HeroUI Button with Sentinel defaults
│   │   ├── KioskButton.tsx # 56px touch target variant
│   │   └── index.ts
│   └── index.ts
```

### Phase 2: Frontend App (Admin Dashboard)

**Scope**: Upgrade HeroUI v2 → v3, Tailwind v3 → v4

1. Update dependencies:
   ```bash
   bun remove @heroui/react tailwindcss autoprefixer postcss
   bun add @heroui/react@latest framer-motion@latest
   bun add -D tailwindcss@latest @tailwindcss/vite
   ```

2. Migrate Tailwind config:
   - Delete `tailwind.config.ts`, `postcss.config.js`
   - Create `hero.ts` for HeroUI plugin
   - Update `src/styles/global.css` to CSS-first format

3. Update component imports:
   - Most HeroUI v2 → v3 imports are compatible
   - Provider setup may need adjustment

4. Integrate HeroUI Pro Application Pack:
   - Sidebar component
   - Stats/KPI components for Dashboard
   - Table with advanced features

### Phase 3: Kiosk App

**Scope**: Add HeroUI v3, migrate Tailwind v3 → v4, preserve touch optimization

1. Add HeroUI dependencies:
   ```bash
   bun add @heroui/react framer-motion
   bun add -D tailwindcss@latest @tailwindcss/vite
   ```

2. Create kiosk-specific component variants:
   - Button with `size="lg"` and custom 56px min-height
   - Input with larger touch targets
   - Preserve `.kiosk-mode` CSS class for overrides

3. Replace custom button classes with HeroUI:
   - `.kiosk-button-primary` → `<Button size="lg" color="primary">`
   - `.kiosk-button-secondary` → `<Button size="lg" variant="bordered">`

4. Wrap app in HeroUIProvider

### Phase 4: TV Display App

**Scope**: Add HeroUI v3, migrate Tailwind v3 → v4, preserve 10-foot UI

1. Add HeroUI dependencies (same as kiosk)

2. Create TV-specific variants:
   - Use CSS custom properties for scaled typography
   - Disable hover states (`cursor: default`)
   - Preserve `.tv-mode` class

3. Minimal HeroUI component usage:
   - Card for presence stats
   - Keep custom layouts (optimized for large displays)

### Phase 5: HeroUI Pro Integration (Frontend only)

**Application Pack components to integrate**:

1. **Sidebar/Navigation** - Replace custom Sidebar.tsx
2. **Stats Cards** - Dashboard KPIs
3. **Data Tables** - Enhanced Members/Events tables
4. **Forms** - Member/Event modals

---

## Tailwind v4 Configuration

### New CSS-First Approach

**Before (tailwind.config.ts)**:
```typescript
export default {
  content: [...],
  theme: { extend: {...} },
  plugins: [heroui()],
}
```

**After (CSS in global.css)**:
```css
@import "tailwindcss";
@plugin './hero.ts';
@source '../../node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}';
@custom-variant dark (&:is(.dark *));
```

### hero.ts (per app)

```typescript
import { heroui } from "@heroui/react";
import { sentinelTheme } from "@sentinel/ui/tokens";

export default heroui(sentinelTheme);
```

---

## Breaking Changes & Mitigations

| Change | Impact | Mitigation |
|--------|--------|------------|
| Tailwind v3 → v4 | Config file format | CSS-first approach |
| HeroUI v2 → v3 | Minor API changes | Review component props |
| React 18 → 19 (kiosk) | Already on 19 | Frontend/TV may stay on 18 |
| PostCSS → @tailwindcss/vite | Vite plugin | Simpler config |

---

## Implementation Order

```
┌─────────────────────────────────────────────────────────────┐
│  1. Create shared/ui package with tokens + hero.ts         │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Migrate frontend (most HeroUI usage, test migration)   │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Migrate tv-display (simplest, minimal components)      │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Migrate kiosk (most custom styling, test touch UX)     │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Integrate HeroUI Pro Application Pack (frontend)       │
└─────────────────────────────────────────────────────────────┘
```

---

## File Changes Summary

### shared/ui/ (NEW)
- `package.json`
- `hero.ts`
- `theme.css`
- `tokens.ts`
- `components/index.ts`

### frontend/
- DELETE: `tailwind.config.ts`, `postcss.config.js`
- UPDATE: `package.json` (dependencies)
- UPDATE: `vite.config.ts` (add @tailwindcss/vite)
- UPDATE: `src/styles/global.css` (CSS-first Tailwind)
- CREATE: `hero.ts`
- UPDATE: Component imports if any v2→v3 changes

### kiosk/
- DELETE: `tailwind.config.ts`, `tailwind.config.js`, `postcss.config.js`
- UPDATE: `package.json`
- UPDATE: `vite.config.ts`
- UPDATE: `src/styles/global.css`
- CREATE: `hero.ts`
- UPDATE: `src/main.tsx` (add HeroUIProvider)
- UPDATE: All screens to use HeroUI components

### tv-display/
- DELETE: `tailwind.config.ts`, `postcss.config.js`
- UPDATE: `package.json`
- UPDATE: `vite.config.ts`
- UPDATE: `src/index.css`
- CREATE: `hero.ts`
- UPDATE: `src/main.tsx` (add HeroUIProvider)
- Optional: Use HeroUI Card for stats

---

## Testing Checklist

- [ ] Frontend: All pages render correctly
- [ ] Frontend: HeroUI components styled with Sentinel theme
- [ ] Frontend: Light mode only (no dark mode)
- [ ] Kiosk: Touch targets remain 56px minimum
- [ ] Kiosk: Buttons feel responsive (scale on press)
- [ ] Kiosk: Works on Raspberry Pi (reduced animations)
- [ ] TV Display: 10-foot UI readable
- [ ] TV Display: No cursor/hover effects
- [ ] All: WCAG AA contrast (4.5:1 minimum)

---

## Estimated Effort

| Phase | Time | Complexity |
|-------|------|------------|
| Shared UI package | 2 hours | Low |
| Frontend migration | 4 hours | Medium |
| TV Display migration | 2 hours | Low |
| Kiosk migration | 4 hours | Medium |
| HeroUI Pro integration | 4 hours | Medium |
| **Total** | **16 hours** | |

---

## Dependencies to Install

### All Apps
```bash
# Tailwind v4
bun add -D tailwindcss@latest @tailwindcss/vite

# HeroUI v3
bun add @heroui/react framer-motion

# Remove old PostCSS (handled by Vite plugin)
bun remove autoprefixer postcss
```

### Frontend (Pro components)
```bash
bun add @iconify/react usehooks-ts
```
