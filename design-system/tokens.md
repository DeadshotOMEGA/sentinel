# Design Tokens

CSS variables for Sentinel. Single source of truth: `heroui-theme-config.ts`.

## Colors

### Primary (Azure Blue)
| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | `#007fff` | Buttons, links, focus states |
| `--color-primary-hover` | `#0066cc` | Hover states |
| `--color-primary-light` | `#e6f3ff` | Backgrounds, badges |

### Accent (Orange)
| Token | Value | Usage |
|-------|-------|-------|
| `--color-accent` | `#ff8000` | Highlights, visitors |
| `--color-accent-hover` | `#cc6600` | Hover states |
| `--color-accent-light` | `#fff3e6` | Backgrounds |

### Semantic
| Token | Value | Usage |
|-------|-------|-------|
| `--color-success` | `#10b981` | Present, check-in confirmed |
| `--color-success-light` | `#d1fae5` | Success backgrounds |
| `--color-warning` | `#f59e0b` | Offline, syncing |
| `--color-warning-light` | `#fef3c7` | Warning backgrounds |
| `--color-error` | `#ef4444` | Errors, badge unknown |
| `--color-error-light` | `#fee2e2` | Error backgrounds |
| `--color-info` | `#0ea5e9` | Informational |
| `--color-info-light` | `#e0f2fe` | Info backgrounds |

### Neutral Scale (Slate)
| Token | Value | Usage |
|-------|-------|-------|
| `--color-neutral-900` | `#0f172a` | Headings |
| `--color-neutral-700` | `#334155` | Body text |
| `--color-neutral-500` | `#64748b` | Secondary text |
| `--color-neutral-300` | `#cbd5e1` | Borders |
| `--color-neutral-200` | `#e2e8f0` | Dividers |
| `--color-neutral-100` | `#f1f5f9` | Hover backgrounds |
| `--color-neutral-50` | `#f8fafc` | Page background |
| `--color-white` | `#ffffff` | Cards, inputs |

## Typography

### Fonts
```css
--font-sans: 'Inter', system-ui, -apple-system, sans-serif;
--font-mono: 'JetBrains Mono', ui-monospace, monospace;
```

### Font Sizes
| Token | Size | Usage |
|-------|------|-------|
| `--text-display` | 3rem (48px) | TV stats, kiosk time |
| `--text-h1` | 2rem (32px) | Page titles |
| `--text-h2` | 1.5rem (24px) | Section headers |
| `--text-h3` | 1.25rem (20px) | Card titles |
| `--text-body-lg` | 1.125rem (18px) | Kiosk text |
| `--text-body` | 1rem (16px) | Default body |
| `--text-body-sm` | 0.875rem (14px) | Table cells, hints |
| `--text-caption` | 0.75rem (12px) | Labels, badges |

### Font Weights
| Token | Weight |
|-------|--------|
| `--font-normal` | 400 |
| `--font-medium` | 500 |
| `--font-semibold` | 600 |
| `--font-bold` | 700 |

## Spacing

| Token | Size | Pixels |
|-------|------|--------|
| `--space-xs` | 0.25rem | 4px |
| `--space-sm` | 0.5rem | 8px |
| `--space-md` | 1rem | 16px |
| `--space-lg` | 1.5rem | 24px |
| `--space-xl` | 2rem | 32px |
| `--space-2xl` | 3rem | 48px |
| `--space-3xl` | 4rem | 64px |

## Border Radius

| Token | Size | Usage |
|-------|------|-------|
| `--radius-sm` | 0.25rem (4px) | Checkboxes |
| `--radius-md` | 0.5rem (8px) | Buttons, inputs |
| `--radius-lg` | 0.75rem (12px) | Cards |
| `--radius-xl` | 1rem (16px) | Modals, kiosk panels |
| `--radius-full` | 9999px | Avatars, badges |

## Shadows

| Token | Usage |
|-------|-------|
| `--shadow-sm` | Tables, subtle cards |
| `--shadow-md` | Elevated cards |
| `--shadow-lg` | Toasts, dropdowns |
| `--shadow-xl` | Modals, kiosk panels |

## Layout

| Token | Value | Usage |
|-------|-------|-------|
| `--sidebar-width` | 240px | Admin sidebar |
| `--header-height` | 64px | Top header |
| `--container-max` | 1440px | Max content width |

## Z-Index Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--z-dropdown` | 100 | Dropdowns |
| `--z-sticky` | 200 | Sticky headers |
| `--z-modal-backdrop` | 300 | Modal overlay |
| `--z-modal` | 400 | Modal content |
| `--z-toast` | 500 | Toast notifications |

## Transitions

| Token | Duration | Usage |
|-------|----------|-------|
| `--transition-fast` | 150ms | Hover states |
| `--transition-normal` | 200ms | Modal, toast animations |
| `--transition-slow` | 300ms | Complex transitions |

All use `cubic-bezier(0.4, 0, 0.2, 1)` easing.
