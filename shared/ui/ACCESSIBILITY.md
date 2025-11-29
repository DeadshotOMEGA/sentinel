# Sentinel Accessibility - Color Contrast

All Sentinel design tokens meet **WCAG 2.1 Level AA** contrast requirements (4.5:1 for normal text, 3:1 for large text).

## Text Colors

All text colors tested on white (#ffffff) background:

| Color | Hex | Contrast Ratio | WCAG AA |
|-------|-----|----------------|---------|
| Primary | `#0f172a` | 17.85:1 | ✓ Pass |
| Secondary | `#475569` | 7.58:1 | ✓ Pass |
| Muted | `#64748b` | 4.76:1 | ✓ Pass |
| Inverse | `#ffffff` | N/A | For dark backgrounds |

## Status Colors

All status color combinations (text on background):

| Status | Text | Background | Contrast Ratio | WCAG AA |
|--------|------|------------|----------------|---------|
| Success | `#166534` | `#dcfce7` | 6.49:1 | ✓ Pass |
| Warning | `#92400e` | `#fef3c7` | 6.37:1 | ✓ Pass |
| Error | `#991b1b` | `#fee2e2` | 6.80:1 | ✓ Pass |
| Info | `#1e40af` | `#dbeafe` | 7.15:1 | ✓ Pass |
| Neutral | `#374151` | `#f3f4f6` | 9.37:1 | ✓ Pass |

## Badge Colors

All badge color combinations (text on background):

| Badge | Text | Background | Contrast Ratio | WCAG AA |
|-------|------|------------|----------------|---------|
| Present | `#166534` | `#dcfce7` | 6.49:1 | ✓ Pass |
| Absent | `#991b1b` | `#fee2e2` | 6.80:1 | ✓ Pass |
| Visitor | `#1e40af` | `#dbeafe` | 7.15:1 | ✓ Pass |
| Active | `#166534` | `#dcfce7` | 6.49:1 | ✓ Pass |
| Inactive | `#475569` | `#f3f4f6` | 6.89:1 | ✓ Pass |
| Draft | `#92400e` | `#fef3c7` | 6.37:1 | ✓ Pass |
| Pending | `#92400e` | `#fef3c7` | 6.37:1 | ✓ Pass |
| Excused | `#374151` | `#f3f4f6` | 9.37:1 | ✓ Pass |

## Usage

### TypeScript/React

```typescript
import { textColors, statusColors, badgeColors } from '@sentinel/ui/tokens';

// Text colors
<p style={{ color: textColors.primary }}>Primary text</p>
<p style={{ color: textColors.secondary }}>Secondary text</p>
<p style={{ color: textColors.muted }}>Muted text</p>

// Status indicators
<div style={{
  backgroundColor: statusColors.success.bg,
  color: statusColors.success.text,
  borderColor: statusColors.success.border
}}>
  Success message
</div>

// Badges
<span style={{
  backgroundColor: badgeColors.present.bg,
  color: badgeColors.present.text
}}>
  Present
</span>
```

### CSS Variables

All tokens are exported as CSS custom properties:

```css
/* Text colors */
color: var(--sentinel-text-primary);
color: var(--sentinel-text-secondary);
color: var(--sentinel-text-muted);

/* Status colors */
background-color: var(--sentinel-status-success-bg);
color: var(--sentinel-status-success-text);
border-color: var(--sentinel-status-success-border);

/* Badge colors */
background-color: var(--sentinel-badge-present-bg);
color: var(--sentinel-badge-present-text);
```

## Contrast Utilities

```typescript
import { getContrastRatio, meetsWCAG_AA } from '@sentinel/ui/utils';

// Calculate contrast ratio
const ratio = getContrastRatio('#166534', '#dcfce7'); // 6.49

// Check WCAG AA compliance
const passes = meetsWCAG_AA('#166534', '#dcfce7'); // true
const passesLargeText = meetsWCAG_AA('#166534', '#dcfce7', true); // true
```

## Testing

Run contrast validation:

```bash
bun run shared/ui/utils/validate-contrast.ts
bun run shared/ui/utils/test-tokens.ts
```

## Notes

- All ratios exceed WCAG AA minimum (4.5:1)
- Most colors exceed WCAG AAA (7:1)
- Legacy `statusColors` mapping preserved for HeroUI compatibility
- New code should use `statusColors` or `badgeColors` objects directly
