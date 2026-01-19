/**
 * TagChip Component
 *
 * Displays a tag using HeroUI theme colors.
 * Matches the styling used in Settings > Lists > Tags page.
 */

import { Chip } from '@heroui/react';

/** Colors supported natively by HeroUI Chip */
type HeroUIChipColor = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'default';

/** Extended colors from Sentinel theme (require custom styles) */
type ExtendedColor = 'gray' | 'info' | 'accent';

export interface TagChipProps {
  /** Tag name to display */
  tagName: string;
  /** Tag color from HeroUI theme */
  tagColor?: HeroUIChipColor | ExtendedColor;
  /** Chip size */
  size?: 'sm' | 'md' | 'lg';
  /** Optional class name for additional styling */
  className?: string;
}

/** Inline styles for extended colors (using actual theme hex values) */
const extendedColorStyles: Record<ExtendedColor, { backgroundColor: string; color: string }> = {
  gray: { backgroundColor: '#e5e5e5', color: '#525252' },      // gray.100, gray.700
  info: { backgroundColor: '#c2fce7', color: '#006130' },      // info.100 (light teal), info.900 (dark teal)
  accent: { backgroundColor: '#eec9d8', color: '#793658' },    // accent.100 (light magenta), accent.700 (dark magenta)
};

/** Check if color is an extended color requiring custom styles */
function isExtendedColor(color: string): color is ExtendedColor {
  return color === 'gray' || color === 'info' || color === 'accent';
}

/**
 * TagChip displays a tag with a HeroUI theme color.
 * Uses flat variant with small radius for consistency.
 */
export function TagChip({
  tagName,
  tagColor = 'default',
  size = 'sm',
  className,
}: TagChipProps) {
  // Extended colors need custom styling since HeroUI Chip doesn't support them
  if (isExtendedColor(tagColor)) {
    return (
      <Chip
        size={size}
        variant="flat"
        radius="sm"
        style={extendedColorStyles[tagColor]}
        className={className}
      >
        {tagName}
      </Chip>
    );
  }

  // Native HeroUI colors
  return (
    <Chip
      size={size}
      variant="flat"
      radius="sm"
      color={tagColor}
      className={className}
    >
      {tagName}
    </Chip>
  );
}

export default TagChip;
