/**
 * WCAG Contrast Ratio Utilities
 *
 * Provides functions to calculate and validate color contrast ratios
 * according to WCAG 2.1 accessibility guidelines.
 */

/**
 * Calculate relative luminance of an RGB color
 * Per WCAG 2.1 specification
 */
function getRelativeLuminance(r: number, g: number, b: number): number {
  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;

  const rLinear =
    rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const gLinear =
    gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const bLinear =
    bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Parse hex color to RGB values
 * Supports #RGB, #RRGGBB formats
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleanHex = hex.replace("#", "");

  if (cleanHex.length === 3) {
    // Short form (#RGB)
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    return { r, g, b };
  }

  if (cleanHex.length === 6) {
    // Long form (#RRGGBB)
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return { r, g, b };
  }

  throw new Error(`Invalid hex color: ${hex}. Must be #RGB or #RRGGBB format.`);
}

/**
 * Calculate WCAG contrast ratio between two colors
 *
 * @param fg - Foreground color (hex format)
 * @param bg - Background color (hex format)
 * @returns Contrast ratio (1:1 to 21:1)
 *
 * @example
 * getContrastRatio('#000000', '#ffffff') // 21
 * getContrastRatio('#4b5563', '#ffffff') // 7.36
 */
export function getContrastRatio(fg: string, bg: string): number {
  const fgRgb = hexToRgb(fg);
  const bgRgb = hexToRgb(bg);

  const fgLuminance = getRelativeLuminance(fgRgb.r, fgRgb.g, fgRgb.b);
  const bgLuminance = getRelativeLuminance(bgRgb.r, bgRgb.g, bgRgb.b);

  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if color combination meets WCAG AA standards
 *
 * @param fg - Foreground color (hex format)
 * @param bg - Background color (hex format)
 * @param isLargeText - True for text ≥18pt or bold ≥14pt (default: false)
 * @returns True if contrast meets WCAG AA requirements
 *
 * Requirements:
 * - Normal text: 4.5:1 minimum
 * - Large text: 3:1 minimum
 *
 * @example
 * meetsWCAG_AA('#4b5563', '#ffffff') // true (7.36:1)
 * meetsWCAG_AA('#9ca3af', '#ffffff') // false (2.85:1)
 */
export function meetsWCAG_AA(
  fg: string,
  bg: string,
  isLargeText = false
): boolean {
  const ratio = getContrastRatio(fg, bg);
  const requiredRatio = isLargeText ? 3 : 4.5;
  return ratio >= requiredRatio;
}

/**
 * Check if color combination meets WCAG AAA standards
 *
 * @param fg - Foreground color (hex format)
 * @param bg - Background color (hex format)
 * @param isLargeText - True for text ≥18pt or bold ≥14pt (default: false)
 * @returns True if contrast meets WCAG AAA requirements
 *
 * Requirements:
 * - Normal text: 7:1 minimum
 * - Large text: 4.5:1 minimum
 */
export function meetsWCAG_AAA(
  fg: string,
  bg: string,
  isLargeText = false
): boolean {
  const ratio = getContrastRatio(fg, bg);
  const requiredRatio = isLargeText ? 4.5 : 7;
  return ratio >= requiredRatio;
}

/**
 * Get a human-readable description of contrast compliance
 *
 * @example
 * getContrastLevel('#4b5563', '#ffffff')
 * // { ratio: 7.36, aa: true, aaa: true, description: 'AAA (normal text)' }
 */
export function getContrastLevel(
  fg: string,
  bg: string,
  isLargeText = false
): {
  ratio: number;
  aa: boolean;
  aaa: boolean;
  description: string;
} {
  const ratio = getContrastRatio(fg, bg);
  const aa = meetsWCAG_AA(fg, bg, isLargeText);
  const aaa = meetsWCAG_AAA(fg, bg, isLargeText);

  let description: string;
  if (aaa) {
    description = `AAA (${isLargeText ? "large" : "normal"} text)`;
  } else if (aa) {
    description = `AA (${isLargeText ? "large" : "normal"} text)`;
  } else {
    description = "FAIL";
  }

  return { ratio, aa, aaa, description };
}
