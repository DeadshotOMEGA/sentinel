/**
 * Sentinel Design Tokens - Utility tokens only
 *
 * IMPORTANT: Canonical theme (with purple secondary) is in ./theme/
 * This file contains utility tokens that complement the main theme.
 */

// Canonical theme imported from ./theme/
// Use: import { designTokens, sentinelTheme } from "@sentinel/ui/theme"

export const layout = {
  radius: {
    small: "0.375rem",
    medium: "0.5rem",
    large: "0.75rem",
  },
  borderWidth: {
    small: "1px",
    medium: "2px",
    large: "3px",
  },
  disabledOpacity: "0.5",
  boxShadow: {
    small: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    medium: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    large: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  },
} as const;

export const fonts = {
  sans: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
} as const;

/**
 * Typography system - scales, weights, and line heights
 * Based on Inter font with consistent vertical rhythm
 */
export const typography = {
  fontFamily: {
    sans: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
  },
  fontSize: {
    xs: "0.75rem", // 12px
    sm: "0.875rem", // 14px
    base: "1rem", // 16px
    lg: "1.125rem", // 18px
    xl: "1.25rem", // 20px
    "2xl": "1.5rem", // 24px
    "3xl": "1.875rem", // 30px
    "4xl": "2.25rem", // 36px
    "5xl": "3rem", // 48px
  },
  fontWeight: {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
  lineHeight: {
    tight: "1.25",
    normal: "1.5",
    relaxed: "1.75",
  },
} as const;

/**
 * Canonical HeroUI theme is in ./theme/index.ts
 * Import using: import { sentinelTheme } from "@sentinel/ui/theme"
 */

/**
 * Text color tokens - all meet WCAG AA (4.5:1) on white/gray-50 backgrounds
 */
export const textColors = {
  primary: "#0f172a", // gray-900, 17.85:1 on white
  secondary: "#475569", // gray-600, 7.58:1 on white
  muted: "#64748b", // gray-500, 4.76:1 on white (minimum AA)
  inverse: "#ffffff", // white on dark backgrounds
  link: "#0066cc", // primary-600, 4.53:1 on white (WCAG AA compliant for text)
  linkHover: "#004d99", // primary-700, 6.37:1 on white (darker on hover)
} as const;

/**
 * Status colors with accessible foreground/background pairings
 * All combinations meet WCAG AA (4.5:1 minimum)
 */
export const statusColors = {
  success: {
    bg: "#dcfce7", // green-100
    text: "#166534", // green-800, 6.49:1 contrast
    border: "#86efac", // green-300
  },
  warning: {
    bg: "#fef3c7", // amber-100
    text: "#92400e", // amber-800, 6.37:1 contrast
    border: "#fcd34d", // amber-300
  },
  error: {
    bg: "#fee2e2", // red-100
    text: "#991b1b", // red-800, 6.80:1 contrast
    border: "#fca5a5", // red-300
  },
  info: {
    bg: "#dbeafe", // blue-100
    text: "#1e40af", // blue-800, 7.15:1 contrast
    border: "#93c5fd", // blue-300
  },
  neutral: {
    bg: "#f3f4f6", // gray-100
    text: "#374151", // gray-700, 9.37:1 contrast
    border: "#d1d5db", // gray-300
  },
} as const;

/**
 * Badge color variants for member/attendance states
 * All combinations meet WCAG AA (4.5:1 minimum)
 */
export const badgeColors = {
  present: {
    bg: "#dcfce7", // green-100
    text: "#166534", // green-800
  },
  absent: {
    bg: "#fee2e2", // red-100
    text: "#991b1b", // red-800
  },
  visitor: {
    bg: "#dbeafe", // blue-100
    text: "#1e40af", // blue-800
  },
  active: {
    bg: "#dcfce7", // green-100
    text: "#166534", // green-800
  },
  inactive: {
    bg: "#f3f4f6", // gray-100
    text: "#475569", // gray-600 (6.87:1 contrast - meets AA)
  },
  draft: {
    bg: "#fef3c7", // amber-100
    text: "#92400e", // amber-800
  },
  pending: {
    bg: "#fef3c7", // amber-100
    text: "#92400e", // amber-800
  },
  excused: {
    bg: "#f3f4f6", // gray-100
    text: "#374151", // gray-700
  },
} as const;

/**
 * Legacy status color mapping (for HeroUI color prop compatibility)
 * @deprecated Prefer using getStatusColor from @sentinel/ui/theme for canonical mapping
 */
export const legacyStatusColors = {
  present: "success",
  absent: "danger",
  visitor: "secondary",
  pending: "warning",
  excused: "default",
  active: "success",
  inactive: "default",
} as const;

export type LegacyStatusColor =
  (typeof legacyStatusColors)[keyof typeof legacyStatusColors];

/**
 * @deprecated Use getStatusColor from @sentinel/ui/theme instead
 */
export function getStatusColor(
  status: keyof typeof legacyStatusColors
): LegacyStatusColor {
  if (!(status in legacyStatusColors)) {
    throw new Error(
      `Invalid status: ${status}. Valid: ${Object.keys(legacyStatusColors).join(", ")}`
    );
  }
  return legacyStatusColors[status];
}

/**
 * Touch target sizes in pixels
 * Based on WCAG 2.1 Level AAA and kiosk accessibility requirements
 */
export const touchTargets = {
  minimum: 44, // WCAG 2.1 Level AAA minimum
  kiosk: 56, // Kiosk requirement for enhanced accessibility
  comfortable: 64, // Extra large for high accessibility needs
} as const;

/**
 * Focus ring tokens for keyboard navigation
 * Ensures consistent, high-contrast focus indicators across all interfaces
 */
export const focus = {
  ring: "#0066cc", // WCAG AA compliant (4.53:1 on white) - use for focus rings on light backgrounds
  ringBrand: "#007fff", // Brand color - use for focus rings on dark backgrounds only
  ringLight: "#ffffff", // For dark backgrounds
  ringOffset: "2px", // Space between element and focus ring
  ringWidth: "2px", // Width of focus ring
  ringWidthHighContrast: "3px", // Increased width for high contrast mode
} as const;

/**
 * Transition timing tokens
 * Use for consistent animation durations across all interfaces
 */
export const transitions = {
  micro: "150ms", // Micro interactions (button hover, color changes)
  small: "200ms", // Small animations (opacity, badges)
  medium: "300ms", // Medium animations (modals, drawers)
  large: "400ms", // Large animations (page transitions)
  easeOut: "cubic-bezier(0.25, 0.46, 0.45, 0.94)", // Standard ease-out
  easeInOut: "cubic-bezier(0.45, 0, 0.55, 1)", // Standard ease-in-out
} as const;
