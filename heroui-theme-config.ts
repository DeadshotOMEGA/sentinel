/**
 * HeroUI Theme Configuration for Sentinel
 *
 * This configuration maps our design tokens to HeroUI's theming system.
 * HeroUI uses Tailwind CSS with CSS custom properties for runtime theming.
 *
 * Usage:
 * 1. Install: bun add @heroui/react @heroui/theme
 * 2. Add to tailwind.config.js: heroui() plugin with this config
 * 3. Wrap app with HeroUIProvider using this theme
 */

import type { ThemeColors } from "@heroui/theme";

// =============================================================================
// DESIGN TOKENS (from design-document.html)
// =============================================================================

export const designTokens = {
  colors: {
    // Primary - Azure Blue (Sentinel brand)
    primary: {
      50: "#e6f3ff",
      100: "#b3daff",
      200: "#80c1ff",
      300: "#4da8ff",
      400: "#1a8fff",
      500: "#007fff", // Main primary
      600: "#0066cc",
      700: "#004d99",
      800: "#003366",
      900: "#001a33",
      DEFAULT: "#007fff",
      foreground: "#ffffff",
    },

    // Accent - Orange (alerts, highlights)
    secondary: {
      50: "#fff5e6",
      100: "#ffe0b3",
      200: "#ffcc80",
      300: "#ffb84d",
      400: "#ffa31a",
      500: "#ff8000", // Main accent
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

    // Neutral - Slate (from design spec)
    default: {
      50: "#f8fafc",
      100: "#f1f5f9",
      200: "#e2e8f0",
      300: "#cbd5e1",
      400: "#94a3b8",
      500: "#64748b",
      600: "#475569",
      700: "#334155", // Main neutral
      800: "#1e293b",
      900: "#0f172a",
      DEFAULT: "#334155",
      foreground: "#ffffff",
    },

    // Content colors
    content1: "#ffffff",
    content2: "#f8fafc",
    content3: "#f1f5f9",
    content4: "#e2e8f0",

    // Focus ring
    focus: "#007fff",

    // Overlay
    overlay: "rgba(0, 0, 0, 0.5)",

    // Divider
    divider: "#e2e8f0",
  },

  // Layout tokens
  layout: {
    // Border radius
    radius: {
      small: "0.375rem",  // 6px
      medium: "0.5rem",   // 8px
      large: "0.75rem",   // 12px
    },

    // Border width
    borderWidth: {
      small: "1px",
      medium: "2px",
      large: "3px",
    },

    // Disabled opacity
    disabledOpacity: "0.5",

    // Box shadow
    boxShadow: {
      small: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
      medium: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
      large: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
    },
  },

  // Typography
  fonts: {
    sans: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
  },
} as const;

// =============================================================================
// HEROUI THEME OBJECT
// =============================================================================

export const sentinelTheme = {
  themes: {
    light: {
      colors: designTokens.colors as unknown as ThemeColors,
      layout: designTokens.layout,
    },
    // We only support light mode per requirements
  },
};

// =============================================================================
// TAILWIND CONFIG EXTENSION
// =============================================================================

/**
 * Add to tailwind.config.js:
 *
 * import { heroui } from "@heroui/theme";
 * import { tailwindExtend } from "./heroui-theme-config";
 *
 * export default {
 *   content: [
 *     "./src/**\/*.{js,ts,jsx,tsx}",
 *     "./node_modules/@heroui/theme/dist/**\/*.{js,ts,jsx,tsx}",
 *   ],
 *   theme: {
 *     extend: tailwindExtend,
 *   },
 *   darkMode: "class",
 *   plugins: [heroui(sentinelTheme)],
 * };
 */

export const tailwindExtend = {
  colors: {
    // Semantic aliases for common use
    "sentinel-blue": designTokens.colors.primary.DEFAULT,
    "sentinel-orange": designTokens.colors.secondary.DEFAULT,
  },

  fontFamily: {
    sans: [designTokens.fonts.sans],
    mono: [designTokens.fonts.mono],
  },

  // Touch target minimum sizes (kiosk mode)
  minHeight: {
    "touch": "48px",
    "touch-lg": "56px",
  },
  minWidth: {
    "touch": "48px",
    "touch-lg": "56px",
  },

  // TV view large sizes
  fontSize: {
    "tv-xl": ["3rem", { lineHeight: "1.2" }],
    "tv-2xl": ["4rem", { lineHeight: "1.1" }],
    "tv-3xl": ["5rem", { lineHeight: "1" }],
    "tv-stat": ["6rem", { lineHeight: "1" }],
  },

  // Animation durations (reduced for Pi performance)
  transitionDuration: {
    "fast": "100ms",
    "normal": "200ms",
  },
};

// =============================================================================
// CSS CUSTOM PROPERTIES (for runtime access)
// =============================================================================

/**
 * These CSS variables are set by HeroUI automatically,
 * but we also define them for use outside React components.
 *
 * Add to global CSS:
 * @import "./heroui-css-vars.css";
 */

export const cssVariables = `
:root {
  /* Primary - Azure Blue */
  --sentinel-primary: ${designTokens.colors.primary.DEFAULT};
  --sentinel-primary-hover: ${designTokens.colors.primary[600]};
  --sentinel-primary-light: ${designTokens.colors.primary[100]};

  /* Accent - Orange */
  --sentinel-accent: ${designTokens.colors.secondary.DEFAULT};
  --sentinel-accent-hover: ${designTokens.colors.secondary[600]};

  /* Semantic */
  --sentinel-success: ${designTokens.colors.success.DEFAULT};
  --sentinel-warning: ${designTokens.colors.warning.DEFAULT};
  --sentinel-danger: ${designTokens.colors.danger.DEFAULT};

  /* Neutral */
  --sentinel-neutral-50: ${designTokens.colors.default[50]};
  --sentinel-neutral-100: ${designTokens.colors.default[100]};
  --sentinel-neutral-200: ${designTokens.colors.default[200]};
  --sentinel-neutral-700: ${designTokens.colors.default[700]};
  --sentinel-neutral-900: ${designTokens.colors.default[900]};

  /* Typography */
  --sentinel-font-sans: ${designTokens.fonts.sans};
  --sentinel-font-mono: ${designTokens.fonts.mono};

  /* Layout */
  --sentinel-radius-sm: ${designTokens.layout.radius.small};
  --sentinel-radius-md: ${designTokens.layout.radius.medium};
  --sentinel-radius-lg: ${designTokens.layout.radius.large};

  /* Shadows */
  --sentinel-shadow-sm: ${designTokens.layout.boxShadow.small};
  --sentinel-shadow-md: ${designTokens.layout.boxShadow.medium};
  --sentinel-shadow-lg: ${designTokens.layout.boxShadow.large};
}

/* Kiosk mode overrides - larger touch targets */
.kiosk-mode {
  --heroui-radius-medium: 12px;
}

.kiosk-mode [data-slot="base"] {
  min-height: 56px;
  font-size: 1.125rem;
}

/* TV mode overrides - passive display optimizations */
.tv-mode {
  --heroui-font-size-large: 2rem;
}

.tv-mode * {
  cursor: default !important;
}

/* Reduced motion for Pi performance */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
`;

// =============================================================================
// COMPONENT STYLE OVERRIDES
// =============================================================================

/**
 * HeroUI component customizations for Sentinel.
 * Pass these to individual components or use in a custom provider.
 */

export const componentStyles = {
  // Button - ensure adequate touch targets
  button: {
    defaultProps: {
      radius: "md",
    },
    classNames: {
      base: "font-medium",
    },
  },

  // Input - larger for kiosk
  input: {
    defaultProps: {
      radius: "md",
      variant: "bordered",
    },
  },

  // Table - clean borders
  table: {
    defaultProps: {
      radius: "md",
      shadow: "sm",
    },
    classNames: {
      th: "bg-default-100 text-default-700 font-semibold",
      td: "py-3",
    },
  },

  // Modal - centered with proper spacing
  modal: {
    defaultProps: {
      radius: "lg",
      backdrop: "blur",
    },
  },

  // Card - subtle shadow
  card: {
    defaultProps: {
      radius: "lg",
      shadow: "sm",
    },
  },

  // Badge/Chip - status indicators
  chip: {
    classNames: {
      base: "font-medium",
    },
  },
};

// =============================================================================
// STATUS COLOR MAPPING
// =============================================================================

/**
 * Map attendance statuses to HeroUI color props
 */
export const statusColors = {
  present: "success",
  absent: "danger",
  visitor: "secondary",
  pending: "warning",
  excused: "default",
} as const;

/**
 * Get the HeroUI color prop for a status
 */
export function getStatusColor(status: keyof typeof statusColors): typeof statusColors[keyof typeof statusColors] {
  if (!(status in statusColors)) {
    throw new Error(`Invalid status: ${status}. Valid statuses: ${Object.keys(statusColors).join(", ")}`);
  }
  return statusColors[status];
}

// =============================================================================
// USAGE EXAMPLE
// =============================================================================

/*
// In your React app entry point:

import { HeroUIProvider } from "@heroui/react";
import { sentinelTheme } from "./heroui-theme-config";

function App() {
  return (
    <HeroUIProvider theme={sentinelTheme}>
      <RouterProvider router={router} />
    </HeroUIProvider>
  );
}

// In a component:

import { Button, Chip } from "@heroui/react";
import { getStatusColor } from "./heroui-theme-config";

function MemberRow({ member }) {
  return (
    <tr>
      <td>{member.name}</td>
      <td>
        <Chip color={getStatusColor(member.status)} variant="flat">
          {member.status}
        </Chip>
      </td>
      <td>
        <Button color="primary" size="sm">
          View
        </Button>
      </td>
    </tr>
  );
}
*/
