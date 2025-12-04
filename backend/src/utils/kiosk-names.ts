/**
 * Kiosk name mapping utility
 * Maps kiosk IDs to human-readable names for display
 */

const KIOSK_NAMES: Record<string, string> = {
  'front-kiosk': 'Front Kiosk',
  'drill-deck': 'Drill Deck',
  'rear-exit': 'Rear Exit',
  'main-entrance': 'Main Entrance',
  'admin': 'Admin Portal',
  'kiosk-1': 'Kiosk 1',
  'kiosk-2': 'Kiosk 2',
};

/**
 * Get human-readable kiosk name from kiosk ID
 * Returns formatted ID if not in mapping (for backwards compatibility with existing data)
 */
export function getKioskName(kioskId: string): string {
  const name = KIOSK_NAMES[kioskId];
  if (name) {
    return name;
  }
  // Format unknown IDs: "some-kiosk-id" -> "Some Kiosk Id"
  return kioskId
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Check if a kiosk ID is registered
 */
export function isValidKioskId(kioskId: string): boolean {
  return kioskId in KIOSK_NAMES;
}

/**
 * Get all registered kiosk IDs
 */
export function getRegisteredKioskIds(): string[] {
  return Object.keys(KIOSK_NAMES);
}
