/**
 * TagChip Component
 *
 * Displays a tag with deterministic color assignment based on tag name.
 * Uses HeroUI semantic colors via the getTagColor utility.
 */

import { Chip } from '@heroui/react';
import { getTagColor } from '../../utils/tag-colors';

export interface TagChipProps {
  /** Tag name to display */
  tagName: string;
  /** Chip size */
  size?: 'sm' | 'md' | 'lg';
  /** Chip variant */
  variant?: 'solid' | 'flat' | 'bordered' | 'light' | 'faded' | 'shadow' | 'dot';
  /** Optional class name for additional styling */
  className?: string;
}

/**
 * TagChip displays a tag with a color determined by hashing the tag name.
 * This ensures consistent colors for the same tag across the application.
 */
export function TagChip({
  tagName,
  size = 'sm',
  variant = 'flat',
  className,
}: TagChipProps) {
  const color = getTagColor(tagName);

  return (
    <Chip size={size} variant={variant} color={color} className={className}>
      {tagName}
    </Chip>
  );
}

export default TagChip;
