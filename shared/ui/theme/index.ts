/**
 * HeroUI Theme Configuration for Sentinel
 *
 * Single source of truth for theme across all apps (frontend, kiosk, tv-display).
 * HeroUI uses Tailwind CSS with CSS custom properties for runtime theming.
 *
 * IMPORTANT: DEFAULT for each color is ALWAYS the 600 shade for WCAG AA compliance.
 *
 * Usage:
 * 1. Install: bun add @heroui/react @heroui/theme
 * 2. Add to tailwind.config.ts: heroui(sentinelTheme) plugin
 * 3. Wrap app with HeroUIProvider
 */

import type { ThemeColors, HeroUIPluginConfig } from "@heroui/theme";

// =============================================================================
// DESIGN TOKENS - 8 Semantic Colors with full 50-950 scales
// =============================================================================

export const designTokens = {
  colors: {
    // Primary - Blue (Sentinel brand)
    primary: {
      50: "#e8f1fc",
      100: "#c7dcf8",
      200: "#a3c7f4",
      300: "#7eb1f0",
      400: "#5a9cec",
      500: "#3687e8",
      600: "#205bcf", // DEFAULT - WCAG AA compliant
      700: "#1a4aa8",
      800: "#143a82",
      900: "#0e295c",
      950: "#081936",
      DEFAULT: "#205bcf",
      foreground: "#ffffff",
    },

    // Secondary - Purple (CANONICAL per user requirements)
    secondary: {
      50: "#f5e8f8",
      100: "#e6c8ef",
      200: "#d6a7e5",
      300: "#c686db",
      400: "#b665d1",
      500: "#a644c7",
      600: "#9a18b3", // DEFAULT - WCAG AA compliant
      700: "#7c1391",
      800: "#5e0f6e",
      900: "#400a4c",
      950: "#22052a",
      DEFAULT: "#9a18b3",
      foreground: "#ffffff",
    },

    // Success - Green
    success: {
      50: "#e6f5ec",
      100: "#c2e7d0",
      200: "#9bd8b3",
      300: "#74c996",
      400: "#4dba79",
      500: "#26ab5c",
      600: "#037a36", // DEFAULT - WCAG AA compliant
      700: "#02622b",
      800: "#024a20",
      900: "#013216",
      950: "#001a0b",
      DEFAULT: "#037a36",
      foreground: "#ffffff",
    },

    // Warning - Orange
    warning: {
      50: "#fef6e6",
      100: "#fce9c2",
      200: "#fadb9b",
      300: "#f8cd74",
      400: "#f6bf4d",
      500: "#f4b126",
      600: "#a16603", // DEFAULT - WCAG AA compliant
      700: "#825203",
      800: "#633e02",
      900: "#442a01",
      950: "#251701",
      DEFAULT: "#a16603",
      foreground: "#ffffff",
    },

    // Danger - Red
    danger: {
      50: "#fde8ea",
      100: "#f9c6cb",
      200: "#f5a3ab",
      300: "#f1808c",
      400: "#ed5d6c",
      500: "#e93a4d",
      600: "#be041e", // DEFAULT - WCAG AA compliant
      700: "#980318",
      800: "#720212",
      900: "#4c020c",
      950: "#260106",
      DEFAULT: "#be041e",
      foreground: "#ffffff",
    },

    // Gray - Neutral
    gray: {
      50: "#f5f5f5",
      100: "#e5e5e5",
      200: "#d4d4d4",
      300: "#c4c4c4",
      400: "#a3a3a3",
      500: "#838383",
      600: "#656565", // DEFAULT - WCAG AA compliant
      700: "#525252",
      800: "#3f3f3f",
      900: "#2b2b2b",
      950: "#171717",
      DEFAULT: "#656565",
      foreground: "#ffffff",
    },

    // Info - Bright Teal
    info: {
      50: "#e6fef5",
      100: "#c2fce7",
      200: "#9bfad8",
      300: "#74f8c9",
      400: "#4df6ba",
      500: "#26f4ab",
      600: "#01f378", // DEFAULT - bright teal
      700: "#01c260",
      800: "#019248",
      900: "#006130",
      950: "#003118",
      DEFAULT: "#01f378",
      foreground: "#000000", // Black foreground for bright teal
    },

    // Accent - Magenta
    accent: {
      50: "#f8e9ef",
      100: "#eec9d8",
      200: "#e3a8c0",
      300: "#d988a8",
      400: "#ce6791",
      500: "#c44779",
      600: "#97436e", // DEFAULT - WCAG AA compliant
      700: "#793658",
      800: "#5b2942",
      900: "#3d1c2c",
      950: "#1f0e16",
      DEFAULT: "#97436e",
      foreground: "#ffffff",
    },

    // Default/Neutral - for HeroUI components (uses gray scale)
    default: {
      50: "#f5f5f5",
      100: "#e5e5e5",
      200: "#d4d4d4",
      300: "#c4c4c4",
      400: "#a3a3a3",
      500: "#838383",
      600: "#656565",
      700: "#525252",
      800: "#3f3f3f",
      900: "#2b2b2b",
      950: "#171717",
      DEFAULT: "#d4d4d4",
      foreground: "#000000",
    },

    // Content colors
    content1: {
      DEFAULT: "#ffffff",
      foreground: "#000000",
    },
    content2: {
      DEFAULT: "#f8fafc",
      foreground: "#000000",
    },
    content3: {
      DEFAULT: "#f1f5f9",
      foreground: "#000000",
    },
    content4: {
      DEFAULT: "#e2e8f0",
      foreground: "#000000",
    },

    // Focus ring
    focus: "#205bcf",

    // Overlay
    overlay: "rgba(0, 0, 0, 0.5)",

    // Divider
    divider: "#e2e8f0",
  },

  // Layout tokens per plan specification
  layout: {
    dividerWeight: "1px",
    disabledOpacity: 0.5,
    radius: {
      small: "8px",
      medium: "12px",
      large: "14px",
    },
    borderWidth: {
      small: "1px",
      medium: "2px",
      large: "3px",
    },
    fontSize: {
      tiny: "0.75rem",
      small: "0.875rem",
      medium: "1rem",
      large: "1.125rem",
    },
    lineHeight: {
      tiny: "1rem",
      small: "1.25rem",
      medium: "1.5rem",
      large: "1.75rem",
    },
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
// HEROUI THEME OBJECT (HeroUIPluginConfig type)
// =============================================================================

/**
 * Sentinel theme configuration for HeroUI plugin.
 * Usage: heroui(sentinelTheme)
 */
export const sentinelTheme: HeroUIPluginConfig = {
  themes: {
    light: {
      extend: "light",
      colors: designTokens.colors as unknown as ThemeColors,
      layout: designTokens.layout,
    },
    dark: {
      extend: "dark",
      colors: {
        // Primary - Blue (inverted scale for dark mode)
        primary: {
          50: "#081936",
          100: "#0e295c",
          200: "#143a82",
          300: "#1a4aa8",
          400: "#205bcf",
          500: "#3687e8",
          600: "#5a9cec",
          700: "#7eb1f0",
          800: "#a3c7f4",
          900: "#c7dcf8",
          950: "#e8f1fc",
          DEFAULT: "#205bcf",
          foreground: "#ffffff",
        },

        // Secondary - Purple (inverted scale)
        secondary: {
          50: "#22052a",
          100: "#400a4c",
          200: "#5e0f6e",
          300: "#7c1391",
          400: "#9a18b3",
          500: "#a644c7",
          600: "#b665d1",
          700: "#c686db",
          800: "#d6a7e5",
          900: "#e6c8ef",
          950: "#f5e8f8",
          DEFAULT: "#9a18b3",
          foreground: "#ffffff",
        },

        // Success - Green (inverted scale)
        success: {
          50: "#001a0b",
          100: "#013216",
          200: "#024a20",
          300: "#02622b",
          400: "#037a36",
          500: "#26ab5c",
          600: "#4dba79",
          700: "#74c996",
          800: "#9bd8b3",
          900: "#c2e7d0",
          950: "#e6f5ec",
          DEFAULT: "#037a36",
          foreground: "#ffffff",
        },

        // Warning - Orange (inverted scale)
        warning: {
          50: "#251701",
          100: "#442a01",
          200: "#633e02",
          300: "#825203",
          400: "#a16603",
          500: "#f4b126",
          600: "#f6bf4d",
          700: "#f8cd74",
          800: "#fadb9b",
          900: "#fce9c2",
          950: "#fef6e6",
          DEFAULT: "#a16603",
          foreground: "#ffffff",
        },

        // Danger - Red (inverted scale)
        danger: {
          50: "#260106",
          100: "#4c020c",
          200: "#720212",
          300: "#980318",
          400: "#be041e",
          500: "#e93a4d",
          600: "#ed5d6c",
          700: "#f1808c",
          800: "#f5a3ab",
          900: "#f9c6cb",
          950: "#fde8ea",
          DEFAULT: "#be041e",
          foreground: "#ffffff",
        },

        // Gray - Neutral (inverted scale)
        gray: {
          50: "#171717",
          100: "#2b2b2b",
          200: "#3f3f3f",
          300: "#525252",
          400: "#656565",
          500: "#838383",
          600: "#a3a3a3",
          700: "#c4c4c4",
          800: "#d4d4d4",
          900: "#e5e5e5",
          950: "#f5f5f5",
          DEFAULT: "#656565",
          foreground: "#ffffff",
        },

        // Info - Bright Teal (inverted scale)
        info: {
          50: "#003118",
          100: "#006130",
          200: "#019248",
          300: "#01c260",
          400: "#01f378",
          500: "#26f4ab",
          600: "#4df6ba",
          700: "#74f8c9",
          800: "#9bfad8",
          900: "#c2fce7",
          950: "#e6fef5",
          DEFAULT: "#01f378",
          foreground: "#000000",
        },

        // Accent - Magenta (inverted scale)
        accent: {
          50: "#1f0e16",
          100: "#3d1c2c",
          200: "#5b2942",
          300: "#793658",
          400: "#97436e",
          500: "#c44779",
          600: "#ce6791",
          700: "#d988a8",
          800: "#e3a8c0",
          900: "#eec9d8",
          950: "#f8e9ef",
          DEFAULT: "#97436e",
          foreground: "#ffffff",
        },

        // Default/Neutral (inverted for dark mode)
        default: {
          50: "#171717",
          100: "#2b2b2b",
          200: "#3f3f3f",
          300: "#525252",
          400: "#656565",
          500: "#838383",
          600: "#a3a3a3",
          700: "#c4c4c4",
          800: "#d4d4d4",
          900: "#e5e5e5",
          950: "#f5f5f5",
          DEFAULT: "#3f3f3f",
          foreground: "#ffffff",
        },

        // Content colors for dark mode
        content1: {
          DEFAULT: "#18181b",
          foreground: "#ffffff",
        },
        content2: {
          DEFAULT: "#27272a",
          foreground: "#ffffff",
        },
        content3: {
          DEFAULT: "#3f3f46",
          foreground: "#ffffff",
        },
        content4: {
          DEFAULT: "#52525b",
          foreground: "#ffffff",
        },

        // Dark mode specific
        background: "#000000",
        foreground: "#ffffff",
        focus: "#205bcf",
        overlay: "#ffffff",
        divider: "#3f3f46",
      } as unknown as ThemeColors,
      layout: designTokens.layout,
    },
  },
};

// =============================================================================
// TAILWIND CONFIG EXTENSION
// =============================================================================

export const tailwindExtend = {
  colors: {
    // Semantic aliases for common use
    "sentinel-blue": designTokens.colors.primary.DEFAULT,
    "sentinel-purple": designTokens.colors.secondary.DEFAULT,
    "sentinel-teal": designTokens.colors.info.DEFAULT,
    "sentinel-magenta": designTokens.colors.accent.DEFAULT,
  },

  fontFamily: {
    sans: [designTokens.fonts.sans],
    mono: [designTokens.fonts.mono],
  },

  // Touch target minimum sizes (kiosk mode)
  minHeight: {
    touch: "48px",
    "touch-lg": "56px",
  },
  minWidth: {
    touch: "48px",
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
    fast: "100ms",
    normal: "200ms",
  },

  // Keyframe animations
  keyframes: {
    "slide-down": {
      "0%": { transform: "translateY(-10px)", opacity: "0" },
      "100%": { transform: "translateY(0)", opacity: "1" },
    },
    "pulse-critical": {
      "0%, 100%": { opacity: "1" },
      "50%": { opacity: "0.85" },
    },
    "pulse-warning": {
      "0%, 100%": { opacity: "1" },
      "50%": { opacity: "0.9" },
    },
  },
  animation: {
    "slide-down": "slide-down 200ms ease-out",
    "pulse-critical": "pulse-critical 1s ease-in-out infinite",
    "pulse-warning": "pulse-warning 1.5s ease-in-out infinite",
  },
};

// =============================================================================
// CSS CUSTOM PROPERTIES (for runtime access)
// =============================================================================

export const cssVariables = `
:root {
  /* Primary - Blue */
  --sentinel-primary: ${designTokens.colors.primary.DEFAULT};
  --sentinel-primary-hover: ${designTokens.colors.primary[700]};
  --sentinel-primary-light: ${designTokens.colors.primary[100]};

  /* Secondary - Purple (canonical) */
  --sentinel-secondary: ${designTokens.colors.secondary.DEFAULT};
  --sentinel-secondary-hover: ${designTokens.colors.secondary[700]};

  /* Semantic */
  --sentinel-success: ${designTokens.colors.success.DEFAULT};
  --sentinel-warning: ${designTokens.colors.warning.DEFAULT};
  --sentinel-danger: ${designTokens.colors.danger.DEFAULT};
  --sentinel-info: ${designTokens.colors.info.DEFAULT};
  --sentinel-accent: ${designTokens.colors.accent.DEFAULT};

  /* Neutral */
  --sentinel-gray-50: ${designTokens.colors.gray[50]};
  --sentinel-gray-100: ${designTokens.colors.gray[100]};
  --sentinel-gray-200: ${designTokens.colors.gray[200]};
  --sentinel-gray-600: ${designTokens.colors.gray[600]};
  --sentinel-gray-700: ${designTokens.colors.gray[700]};
  --sentinel-gray-900: ${designTokens.colors.gray[900]};

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

  // Card - medium shadow for visible rounded corners
  card: {
    defaultProps: {
      radius: "lg",
      shadow: "lg",
    },
    classNames: {
      base: "border border-default-100",
    },
  },

  // Badge/Chip - status indicators
  chip: {
    classNames: {
      base: "font-medium",
    },
  },

  // Tabs - consistent with card styling
  tabs: {
    defaultProps: {
      radius: "lg",
      variant: "solid",
    },
    classNames: {
      tabList: "bg-default-100",
      tab: "text-default-500 data-[selected=true]:text-foreground font-medium",
      cursor: "bg-background shadow-md",
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
  active: "success",
  inactive: "default",
} as const;

export type StatusColorKey = keyof typeof statusColors;
export type StatusColorValue = (typeof statusColors)[StatusColorKey];

/**
 * Get the HeroUI color prop for a status
 */
export function getStatusColor(status: StatusColorKey): StatusColorValue {
  if (!(status in statusColors)) {
    throw new Error(
      `Invalid status: ${status}. Valid statuses: ${Object.keys(statusColors).join(", ")}`
    );
  }
  return statusColors[status];
}
