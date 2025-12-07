/**
 * Tag Color Utilities
 * Deterministic hash-based color assignment for member tags
 */

type HeroUIColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';

const TAG_COLORS: HeroUIColor[] = [
  'primary',
  'secondary',
  'success',
  'warning',
  'danger',
];

/**
 * Simple hash function for consistent color assignment
 * Same input always produces same output
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Get a deterministic HeroUI color for a tag name
 * Same tag name always returns the same color
 */
export function getTagColor(tagName: string): HeroUIColor {
  const hash = hashString(tagName.toLowerCase());
  const index = hash % TAG_COLORS.length;
  return TAG_COLORS[index];
}
