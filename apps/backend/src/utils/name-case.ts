/**
 * Converts a name string to proper name case, handling common
 * surname prefixes and patterns found in Canadian military nominal rolls.
 *
 * Examples:
 *   SMITH       → Smith
 *   MACDONALD   → MacDonald
 *   MCDONALD    → McDonald
 *   O'BRIEN     → O'Brien
 *   DE LA CRUZ  → de la Cruz
 *   ST-PIERRE   → St-Pierre
 *   LEBLANC     → LeBlanc
 */

const LOWERCASE_PARTICLES = new Set([
  'de', 'del', 'della', 'di', 'du', 'da',
  'la', 'le', 'les', 'lo',
  'van', 'von', 'den', 'der', 'het',
  'el', 'al',
  'y', 'e',
])

function capitalizeSegment(segment: string): string {
  if (segment.length === 0) return segment

  const lower = segment.toLowerCase()

  // Mc prefix: McDonald, McPherson
  if (lower.length > 2 && lower.startsWith('mc')) {
    return 'Mc' + lower.charAt(2).toUpperCase() + lower.slice(3)
  }

  // Mac prefix: MacDonald, MacPherson (but not Mace, Mack, Mach, etc.)
  // Only apply if 5+ chars to avoid false positives
  if (lower.length >= 5 && lower.startsWith('mac') && lower.charAt(3) !== 'h' && lower.charAt(3) !== 'k' && lower.charAt(3) !== 'e') {
    return 'Mac' + lower.charAt(3).toUpperCase() + lower.slice(4)
  }

  // O' prefix: O'Brien, O'Connor
  if (lower.length > 2 && lower.startsWith("o'")) {
    return "O'" + lower.charAt(2).toUpperCase() + lower.slice(3)
  }

  // St prefix with hyphen: St-Pierre, St-Jean
  if (lower.startsWith('st-') && lower.length > 3) {
    return 'St-' + lower.charAt(3).toUpperCase() + lower.slice(4)
  }

  // Default: capitalize first letter
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

export function toNameCase(name: string): string {
  if (!name) return name

  const trimmed = name.trim()
  if (trimmed.length === 0) return trimmed

  // Split on spaces, hyphens, parentheses (preserving delimiters)
  const parts = trimmed.split(/(\s+|-|[()])/)

  return parts
    .map((part, index) => {
      // Preserve whitespace, hyphens, and parentheses as-is
      if (/^\s+$/.test(part) || part === '-' || part === '(' || part === ')') return part

      const lower = part.toLowerCase()

      // Lowercase particles stay lowercase unless first word
      if (index > 0 && LOWERCASE_PARTICLES.has(lower)) {
        return lower
      }

      return capitalizeSegment(part)
    })
    .join('')
}
