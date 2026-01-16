/**
 * Tag Color Utilities
 *
 * Deterministic hash-based color assignment for member tags.
 * Uses HeroUI semantic colors for consistent theming.
 */
/** Available colors for tag assignment (excludes default for better visibility) */
const TAG_COLORS = [
    'primary',
    'secondary',
    'success',
    'warning',
    'danger',
];
/**
 * Simple hash function for consistent color assignment
 * Same input always produces same output
 * @param str - String to hash
 * @returns Positive integer hash
 */
function hashString(str) {
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
 * @param tagName - The tag name to get a color for
 * @returns HeroUI semantic color name
 */
export function getTagColor(tagName) {
    const hash = hashString(tagName.toLowerCase());
    const index = hash % TAG_COLORS.length;
    return TAG_COLORS[index];
}
