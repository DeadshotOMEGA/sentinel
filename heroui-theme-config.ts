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

    // Accent - Purple (alerts, highlights)
    secondary: {
      50: "#eee4f8",
      100: "#d7bfef",
      200: "#bf99e5",
      300: "#a773db",
      400: "#904ed2",
      500: "#7828c8", // Main accent
      600: "#6321a5",
      700: "#4e1a82",
      800: "#39135f",
      900: "#240c3c",
      DEFAULT: "#7828c8",
      foreground: "#ffffff",
    },

    // Success - Green
    success: {
      50: "#e2f8ec",
      100: "#b9efd1",
      200: "#91e5b5",
      300: "#68dc9a",
      400: "#40d27f",
      500: "#17c964",
      600: "#13a653",
      700: "#0f8341",
      800: "#0b5f30",
      900: "#073c1e",
      DEFAULT: "#17c964",
      foreground: "#000000",
    },

    // Warning - Amber
    warning: {
      50: "#fef4e4",
      100: "#fce4bd",
      200: "#fad497",
      300: "#f9c571",
      400: "#f7b54a",
      500: "#f5a524",
      600: "#ca881e",
      700: "#9f6b17",
      800: "#744e11",
      900: "#4a320b",
      DEFAULT: "#f5a524",
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
      50: "#fafafa",
      100: "#f2f2f3",
      200: "#ebebec",
      300: "#e3e3e6",
      400: "#dcdcdf",
      500: "#d4d4d8",
      600: "#afafb2",
      700: "#8a8a8c",
      800: "#656567",
      900: "#404041",
      DEFAULT: "#d4d4d8",
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
    disabledOpacity: "0.2",

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
    dark: {
      colors: {
        // Primary - Azure Blue (inverted scale)
        primary: {
          50: "#001a33",
          100: "#003366",
          200: "#004d99",
          300: "#0066cc",
          400: "#007fff",
          500: "#1a8fff",
          600: "#4da8ff",
          700: "#80c1ff",
          800: "#b3daff",
          900: "#e6f3ff",
          DEFAULT: "#007fff",
          foreground: "#ffffff",
        },

        // Accent - Purple (inverted scale)
        secondary: {
          50: "#240c3c",
          100: "#39135f",
          200: "#4e1a82",
          300: "#6321a5",
          400: "#7828c8",
          500: "#904ed2",
          600: "#a773db",
          700: "#bf99e5",
          800: "#d7bfef",
          900: "#eee4f8",
          DEFAULT: "#7828c8",
          foreground: "#ffffff",
        },

        // Success - Green (inverted scale)
        success: {
          50: "#073c1e",
          100: "#0b5f30",
          200: "#0f8341",
          300: "#13a653",
          400: "#17c964",
          500: "#40d27f",
          600: "#68dc9a",
          700: "#91e5b5",
          800: "#b9efd1",
          900: "#e2f8ec",
          DEFAULT: "#17c964",
          foreground: "#000000",
        },

        // Warning - Amber (inverted scale)
        warning: {
          50: "#4a320b",
          100: "#744e11",
          200: "#9f6b17",
          300: "#ca881e",
          400: "#f5a524",
          500: "#f7b54a",
          600: "#f9c571",
          700: "#fad497",
          800: "#fce4bd",
          900: "#fef4e4",
          DEFAULT: "#f5a524",
          foreground: "#000000",
        },

        // Danger - Red (inverted scale)
        danger: {
          50: "#380808",
          100: "#610f0f",
          200: "#8a1717",
          300: "#b31e1e",
          400: "#dc2626",
          500: "#ff1a1a",
          600: "#ff4d4d",
          700: "#ff8080",
          800: "#ffb3b3",
          900: "#ffe6e6",
          DEFAULT: "#dc2626",
          foreground: "#ffffff",
        },

        // Neutral (inverted scale)
        default: {
          50: "#404041",
          100: "#656567",
          200: "#8a8a8c",
          300: "#afafb2",
          400: "#d4d4d8",
          500: "#dcdcdf",
          600: "#e3e3e6",
          700: "#ebebec",
          800: "#f2f2f3",
          900: "#fafafa",
          DEFAULT: "#d4d4d8",
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
        focus: "#007fff",
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
    "sentinel-purple": designTokens.colors.secondary.DEFAULT,
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

  // Keyframe animations
  keyframes: {
    "slide-down": {
      "0%": { transform: "translateY(-10px)", opacity: "0" },
      "100%": { transform: "translateY(0)", opacity: "1" },
    },
  },
  animation: {
    "slide-down": "slide-down 200ms ease-out",
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

  /* Accent - Purple */
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
