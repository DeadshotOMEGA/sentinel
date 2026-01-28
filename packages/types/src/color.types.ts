/**
 * HeroUI Theme Colors for Sentinel
 * Extracted from @heroui/theme color definitions
 */

export type ColorShade =
  | '50'
  | '100'
  | '200'
  | '300'
  | '400'
  | '500'
  | '600'
  | '700'
  | '800'
  | '900'

export type BaseColorName =
  | 'blue'
  | 'green'
  | 'pink'
  | 'purple'
  | 'red'
  | 'yellow'
  | 'cyan'
  | 'zinc'

export type SemanticColorName =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'

export type ColorName = BaseColorName | SemanticColorName

/**
 * Color definition with all shades
 */
export interface ColorScale {
  50: string
  100: string
  200: string
  300: string
  400: string
  500: string
  600: string
  700: string
  800: string
  900: string
}

/**
 * Base color palette from HeroUI theme
 */
export const HEROUI_COLORS = {
  blue: {
    50: '#e6f1fe',
    100: '#cce3fd',
    200: '#99c7fb',
    300: '#66aaf9',
    400: '#338ef7',
    500: '#006FEE',
    600: '#005bc4',
    700: '#004493',
    800: '#002e62',
    900: '#001731',
  },
  green: {
    50: '#e8faf0',
    100: '#d1f4e0',
    200: '#a2e9c1',
    300: '#74dfa2',
    400: '#45d483',
    500: '#17c964',
    600: '#12a150',
    700: '#0e793c',
    800: '#095028',
    900: '#052814',
  },
  pink: {
    50: '#ffedfa',
    100: '#ffdcf5',
    200: '#ffb8eb',
    300: '#ff95e1',
    400: '#ff71d7',
    500: '#ff4ecd',
    600: '#cc3ea4',
    700: '#992f7b',
    800: '#661f52',
    900: '#331029',
  },
  purple: {
    50: '#f2eafa',
    100: '#e4d4f4',
    200: '#c9a9e9',
    300: '#ae7ede',
    400: '#9353d3',
    500: '#7828c8',
    600: '#6020a0',
    700: '#481878',
    800: '#301050',
    900: '#180828',
  },
  red: {
    50: '#fee7ef',
    100: '#fdd0df',
    200: '#faa0bf',
    300: '#f871a0',
    400: '#f54180',
    500: '#f31260',
    600: '#c20e4d',
    700: '#920b3a',
    800: '#610726',
    900: '#310413',
  },
  yellow: {
    50: '#fefce8',
    100: '#fdedd3',
    200: '#fbdba7',
    300: '#f9c97c',
    400: '#f7b750',
    500: '#f5a524',
    600: '#c4841d',
    700: '#936316',
    800: '#62420e',
    900: '#312107',
  },
  cyan: {
    50: '#F0FCFF',
    100: '#E6FAFE',
    200: '#D7F8FE',
    300: '#C3F4FD',
    400: '#A5EEFD',
    500: '#7EE7FC',
    600: '#06B7DB',
    700: '#09AACD',
    800: '#0E8AAA',
    900: '#053B48',
  },
  zinc: {
    50: '#fafafa',
    100: '#f4f4f5',
    200: '#e4e4e7',
    300: '#d4d4d8',
    400: '#a1a1aa',
    500: '#71717a',
    600: '#52525b',
    700: '#3f3f46',
    800: '#27272a',
    900: '#18181b',
  },
} as const satisfies Record<BaseColorName, ColorScale>

/**
 * Semantic color mappings (using default shade 500)
 */
export const SEMANTIC_COLORS: Record<SemanticColorName, string> = {
  default: HEROUI_COLORS.zinc[300],
  primary: HEROUI_COLORS.blue[500],
  secondary: HEROUI_COLORS.purple[500],
  success: HEROUI_COLORS.green[500],
  warning: HEROUI_COLORS.yellow[500],
  danger: HEROUI_COLORS.red[500],
}

/**
 * Color options for enum selection dropdowns
 */
export interface ColorOption {
  name: string
  value: string
  hex: string
  shade?: ColorShade
}

/**
 * Get all color options for dropdowns (includes semantic colors + base colors at shade 500)
 */
export function getColorOptions(): ColorOption[] {
  const options: ColorOption[] = []

  // Add semantic colors
  Object.entries(SEMANTIC_COLORS).forEach(([name, hex]) => {
    options.push({
      name,
      value: name,
      hex,
    })
  })

  // Add base colors at default shade (500)
  Object.entries(HEROUI_COLORS).forEach(([name, shades]) => {
    if (!Object.values(SEMANTIC_COLORS).includes(shades[500])) {
      options.push({
        name,
        value: name,
        hex: shades[500],
        shade: '500',
      })
    }
  })

  return options
}

/**
 * Get specific color by name and optional shade
 */
export function getColor(name: ColorName, shade: ColorShade = '500'): string {
  if (name in SEMANTIC_COLORS) {
    return SEMANTIC_COLORS[name as SemanticColorName]
  }

  if (name in HEROUI_COLORS) {
    return HEROUI_COLORS[name as BaseColorName][shade]
  }

  throw new Error(`Unknown color: ${name}`)
}

/**
 * Check if a color name is valid
 */
export function isValidColorName(name: string): name is ColorName {
  return name in SEMANTIC_COLORS || name in HEROUI_COLORS
}
