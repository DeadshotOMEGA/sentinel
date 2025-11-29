/**
 * Utility to normalize names from ALL CAPS to proper case
 * Handles special prefixes like Mc, Mac, O', etc.
 */

/**
 * Convert a name to proper case with special handling for common name patterns
 *
 * Examples:
 * - SMITH -> Smith
 * - MCDONALD -> McDonald
 * - MACDONALD -> MacDonald
 * - O'BRIEN -> O'Brien
 * - DE LA CRUZ -> de la Cruz
 * - SMITH-JONES -> Smith-Jones
 * - VAN DER BERG -> van der Berg
 */
export function normalizeName(name: string): string {
  if (!name) return name;

  // If already mixed case, assume it's correct
  if (name !== name.toUpperCase() && name !== name.toLowerCase()) {
    return name;
  }

  const lowerName = name.toLowerCase();

  // Handle hyphenated names
  if (lowerName.includes('-')) {
    return lowerName
      .split('-')
      .map(part => normalizeNamePart(part))
      .join('-');
  }

  // Handle space-separated names (middle names, compound surnames)
  if (lowerName.includes(' ')) {
    return lowerName
      .split(' ')
      .map(part => normalizeNamePart(part))
      .join(' ');
  }

  return normalizeNamePart(lowerName);
}

/**
 * Normalize a single name part (no spaces or hyphens)
 */
function normalizeNamePart(name: string): string {
  if (!name) return name;

  const lower = name.toLowerCase();

  // Handle Mc prefix (McDonald, McGregor, etc.)
  if (lower.startsWith('mc') && lower.length > 2) {
    return 'Mc' + capitalizeFirst(lower.slice(2));
  }

  // Handle Mac prefix (MacDonald, MacGregor, etc.)
  // Note: Some "Mac" names don't capitalize after (e.g., Mackey)
  // We'll only apply this for names > 5 chars to avoid false positives
  if (lower.startsWith('mac') && lower.length > 5) {
    // Common Mac names that should be MacDonald, MacGregor, etc.
    const macNames = [
      'macdonald', 'macgregor', 'mackenzie', 'mackay', 'maclean',
      'macleod', 'macneil', 'macarthur', 'macintosh', 'macintyre',
      'macmillan', 'macpherson', 'macrae', 'macdougall', 'macfarlane',
    ];
    if (macNames.includes(lower)) {
      return 'Mac' + capitalizeFirst(lower.slice(3));
    }
    // For other Mac names, just capitalize first letter
    return capitalizeFirst(lower);
  }

  // Handle O' prefix (O'Brien, O'Connor, etc.)
  if (lower.startsWith("o'") && lower.length > 2) {
    return "O'" + capitalizeFirst(lower.slice(2));
  }

  // Handle lowercase particles (usually in surnames)
  // These typically stay lowercase when not at the start of a display
  const particles = ['de', 'la', 'le', 'du', 'van', 'von', 'der', 'den', 'het'];
  if (particles.includes(lower)) {
    // Keep lowercase for particles
    return lower;
  }

  // Handle D' prefix (D'Angelo, D'Arcy, etc.)
  if (lower.startsWith("d'") && lower.length > 2) {
    return "D'" + capitalizeFirst(lower.slice(2));
  }

  // Handle St. prefix (St. Pierre, St. John, etc.)
  if (lower === 'st' || lower === 'st.') {
    return 'St.';
  }

  // Standard capitalization
  return capitalizeFirst(lower);
}

/**
 * Capitalize the first letter of a string
 */
function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Normalize both first and last name
 */
export function normalizeNames(firstName: string, lastName: string): { firstName: string; lastName: string } {
  return {
    firstName: normalizeName(firstName),
    lastName: normalizeName(lastName),
  };
}
