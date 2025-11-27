/**
 * Sentinel Design Tokens
 *
 * Centralized design tokens for all Sentinel apps.
 * Used by HeroUI theme and Tailwind CSS.
 */

export const colors = {
  // Primary - Azure Blue (Sentinel brand)
  primary: {
    50: "#e6f3ff",
    100: "#b3daff",
    200: "#80c1ff",
    300: "#4da8ff",
    400: "#1a8fff",
    500: "#007fff",
    600: "#0066cc",
    700: "#004d99",
    800: "#003366",
    900: "#001a33",
    DEFAULT: "#007fff",
    foreground: "#ffffff",
  },

  // Secondary - Orange (alerts, highlights)
  secondary: {
    50: "#fff5e6",
    100: "#ffe0b3",
    200: "#ffcc80",
    300: "#ffb84d",
    400: "#ffa31a",
    500: "#ff8000",
    600: "#cc6600",
    700: "#994d00",
    800: "#663300",
    900: "#331a00",
    DEFAULT: "#ff8000",
    foreground: "#ffffff",
  },

  // Success - Green
  success: {
    50: "#e6f9ed",
    100: "#b3ecc9",
    200: "#80dfa5",
    300: "#4dd281",
    400: "#1ac55d",
    500: "#00b847",
    600: "#009339",
    700: "#006e2b",
    800: "#00491c",
    900: "#00250e",
    DEFAULT: "#00b847",
    foreground: "#ffffff",
  },

  // Warning - Amber
  warning: {
    50: "#fffce6",
    100: "#fff5b3",
    200: "#ffee80",
    300: "#ffe74d",
    400: "#ffe01a",
    500: "#ffc107",
    600: "#cc9a00",
    700: "#997300",
    800: "#664d00",
    900: "#332600",
    DEFAULT: "#ffc107",
    foreground: "#000000",
  },

  // Danger - Red
  danger: {
    50: "#ffe6e6",
    100: "#ffb3b3",
    200: "#ff8080",
    300: "#ff4d4d",
    400: "#ff1a1a",
    500: "#dc2626",
    600: "#b31e1e",
    700: "#8a1717",
    800: "#610f0f",
    900: "#380808",
    DEFAULT: "#dc2626",
    foreground: "#ffffff",
  },

  // Neutral - Slate
  default: {
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    300: "#cbd5e1",
    400: "#94a3b8",
    500: "#64748b",
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a",
    DEFAULT: "#334155",
    foreground: "#ffffff",
  },

  // Semantic content colors
  background: "#ffffff",
  foreground: "#0f172a",
  content1: "#ffffff",
  content2: "#f8fafc",
  content3: "#f1f5f9",
  content4: "#e2e8f0",
  focus: "#007fff",
  overlay: "rgba(0, 0, 0, 0.5)",
  divider: "#e2e8f0",
} as const;

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
 * HeroUI theme configuration object
 * Pass to heroui() plugin in hero.ts
 */
export const sentinelTheme = {
  defaultTheme: "light",
  defaultExtendTheme: "light",
  themes: {
    light: {
      colors: {
        background: colors.background,
        foreground: colors.foreground,
        primary: colors.primary,
        secondary: colors.secondary,
        success: colors.success,
        warning: colors.warning,
        danger: colors.danger,
        default: colors.default,
        content1: colors.content1,
        content2: colors.content2,
        content3: colors.content3,
        content4: colors.content4,
        focus: colors.focus,
        overlay: colors.overlay,
        divider: colors.divider,
      },
      layout: layout,
    },
  },
} as const;

/**
 * Status color mapping for attendance/member states
 */
export const statusColors = {
  present: "success",
  absent: "danger",
  visitor: "secondary",
  pending: "warning",
  excused: "default",
  active: "success",
  inactive: "default",
} as const;

export type StatusColor = (typeof statusColors)[keyof typeof statusColors];

export function getStatusColor(status: keyof typeof statusColors): StatusColor {
  if (!(status in statusColors)) {
    throw new Error(
      `Invalid status: ${status}. Valid: ${Object.keys(statusColors).join(", ")}`
    );
  }
  return statusColors[status];
}
