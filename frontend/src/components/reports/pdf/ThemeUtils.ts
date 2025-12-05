// PDF Color Theme Utilities

export const PDF_COLORS = {
  primary: '#007fff',
  accent: '#ff8000',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  text: '#333333',
  textMuted: '#666666',
  border: '#dddddd',
  backgroundAlt: '#f9f9f9',
};

export function getThresholdColor(flag: 'none' | 'warning' | 'critical'): string {
  switch (flag) {
    case 'none':
      return PDF_COLORS.success;
    case 'warning':
      return PDF_COLORS.warning;
    case 'critical':
      return PDF_COLORS.danger;
    default:
      return PDF_COLORS.text;
  }
}

export function getTrendSymbol(trend: 'up' | 'down' | 'stable' | 'none'): string {
  switch (trend) {
    case 'up':
      return '↑';
    case 'down':
      return '↓';
    case 'stable':
      return '→';
    default:
      return '';
  }
}

export function getTrendColor(trend: 'up' | 'down' | 'stable' | 'none'): string {
  switch (trend) {
    case 'up':
      return PDF_COLORS.success;
    case 'down':
      return PDF_COLORS.danger;
    case 'stable':
      return PDF_COLORS.textMuted;
    default:
      return PDF_COLORS.text;
  }
}

// Typography
export const PDF_TYPOGRAPHY = {
  title: { fontSize: 16, fontWeight: 'bold' as const },
  subtitle: { fontSize: 14, fontWeight: 'bold' as const },
  body: { fontSize: 10 },
  small: { fontSize: 9 },
  tiny: { fontSize: 8 },
};

// Spacing
export const PDF_SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};
