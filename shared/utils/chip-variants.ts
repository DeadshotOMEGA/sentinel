/**
 * Chip Variant Utilities
 *
 * Centralized chip variant configuration for consistent UI across the app.
 * Uses HeroUI semantic colors and variants.
 */

export type ChipVariant = 'solid' | 'flat' | 'faded' | 'dot' | 'bordered' | 'light' | 'shadow';
export type ChipRadius = 'none' | 'sm' | 'md' | 'lg' | 'full';

/**
 * Get chip variant for member status
 * Uses faded variant for softer appearance in status indicators
 */
export function getMemberStatusChipVariant(): ChipVariant {
  return 'faded';
}

/**
 * Get chip variant for badge status
 * Uses dot variant to show a status indicator dot
 */
export function getBadgeStatusChipVariant(): ChipVariant {
  return 'dot';
}

/**
 * Get chip variant for tags
 * Uses flat variant for tag chips
 */
export function getTagChipVariant(): ChipVariant {
  return 'flat';
}

/**
 * Get chip variant for member type
 * Uses solid variant with small radius for classification chips
 */
export function getMemberTypeChipVariant(): { variant: ChipVariant; radius: ChipRadius } {
  return { variant: 'solid', radius: 'sm' };
}

/**
 * Get chip variant for division
 * Uses solid variant with small radius
 */
export function getDivisionChipVariant(): { variant: ChipVariant; radius: ChipRadius } {
  return { variant: 'solid', radius: 'sm' };
}

/**
 * Get chip variant for mess
 * Uses solid variant with small radius
 */
export function getMessChipVariant(): { variant: ChipVariant; radius: ChipRadius } {
  return { variant: 'solid', radius: 'sm' };
}

/**
 * Get chip variant for MOC (Military Occupational Classification)
 * Uses solid variant with small radius
 */
export function getMocChipVariant(): { variant: ChipVariant; radius: ChipRadius } {
  return { variant: 'solid', radius: 'sm' };
}

/**
 * Get chip variant for visit type/reason
 * Uses flat variant for visitor type chips
 */
export function getVisitTypeChipVariant(): ChipVariant {
  return 'flat';
}
