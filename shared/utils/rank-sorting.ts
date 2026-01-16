/**
 * Rank Sorting Utilities
 *
 * Provides sorting functions for military personnel based on rank, mess, and division.
 * Used across tv-display and other apps for consistent member ordering.
 */

/**
 * Mess priority for sorting (lower = higher priority)
 * Wardroom (Officers) > C&POs (Chief Petty Officers & Petty Officers) > Junior Ranks
 */
export const MESS_PRIORITY: Record<string, number> = {
  'Wardroom': 1,
  'C&POs': 2,
  'Junior Ranks': 3,
};

/**
 * RCN Rank priority (lower = higher rank)
 * Based on Canada.ca official Royal Canadian Navy rank structure
 */
export const RANK_PRIORITY: Record<string, number> = {
  // Flag Officers
  'Adm': 1,
  'VAdm': 2,
  'RAdm': 3,
  'Cmdre': 4,
  // Senior Officers
  'Capt(N)': 5,
  'Cdr': 6,
  'LCdr': 7,
  // Junior Officers
  'Lt(N)': 8,
  'SLt': 9,
  'A/SLt': 10,
  // Subordinate Officer
  'NCdt': 11,
  'OCdt': 11, // Officer Cadet (Army/Air Force equivalent)
  // Senior NCMs
  'CPO1': 20,
  'CPO2': 21,
  'PO1': 22,
  'PO2': 23,
  // Junior NCMs
  'MS': 30,
  'LS': 31,
  'AB': 32,
  'OS': 33,
  // Civilian/Other
  'Civ': 99,
};

/**
 * Get mess priority for sorting
 * @param mess - Mess name or null
 * @returns Priority number (lower = higher priority)
 */
export function getMessPriority(mess: string | null): number {
  if (!mess) return 99;
  return MESS_PRIORITY[mess] ?? 50;
}

/**
 * Get rank priority for sorting
 * @param rank - Rank abbreviation or null
 * @returns Priority number (lower = higher rank)
 */
export function getRankPriority(rank: string | null): number {
  if (!rank) return 100;
  const normalized = rank.trim();
  if (normalized in RANK_PRIORITY) {
    return RANK_PRIORITY[normalized];
  }
  // Try case-insensitive match
  const upperRank = normalized.toUpperCase();
  for (const [key, value] of Object.entries(RANK_PRIORITY)) {
    if (key.toUpperCase() === upperRank) {
      return value;
    }
  }
  return 50; // Unknown rank goes middle
}

/**
 * Check if a rank is an officer rank (priority 1-11)
 * @param rank - Rank abbreviation or null
 * @returns true if officer, false otherwise
 */
export function isOfficer(rank: string | null): boolean {
  const priority = getRankPriority(rank);
  return priority <= 11;
}

/**
 * Interface for members that can be sorted
 * Minimal interface - works with any type that has these fields
 */
export interface SortableMember {
  firstName: string;
  lastName: string;
  rank: string | null;
  division: string;
  mess: string | null;
}

/**
 * Sort members by mess priority (for scroll view)
 * Order: Command division first, then by mess (Wardroom > C&POs > Junior Ranks),
 * then by division name, then by name
 *
 * @param members - Array of members to sort
 * @returns New sorted array (does not mutate original)
 */
export function sortMembersByMess<T extends SortableMember>(members: T[]): T[] {
  return [...members].sort((a, b) => {
    // 1. Command division first
    const aIsCommand = a.division === 'Command' ? 0 : 1;
    const bIsCommand = b.division === 'Command' ? 0 : 1;
    if (aIsCommand !== bIsCommand) return aIsCommand - bIsCommand;

    // 2. Sort by mess priority
    const messDiff = getMessPriority(a.mess) - getMessPriority(b.mess);
    if (messDiff !== 0) return messDiff;

    // 3. Division (alphabetical)
    const divisionDiff = a.division.localeCompare(b.division);
    if (divisionDiff !== 0) return divisionDiff;

    // 4. Last name (alphabetical)
    const lastNameDiff = a.lastName.localeCompare(b.lastName);
    if (lastNameDiff !== 0) return lastNameDiff;

    // 5. First name (alphabetical)
    return a.firstName.localeCompare(b.firstName);
  });
}

/**
 * Sort members by rank (for person cards and dense view)
 * Order: Command division first, then officers before NCMs,
 * then by rank seniority, then by name
 *
 * @param members - Array of members to sort
 * @returns New sorted array (does not mutate original)
 */
export function sortMembersByRank<T extends SortableMember>(members: T[]): T[] {
  return [...members].sort((a, b) => {
    // 1. Command division first
    const aIsCommand = a.division === 'Command' ? 0 : 1;
    const bIsCommand = b.division === 'Command' ? 0 : 1;
    if (aIsCommand !== bIsCommand) return aIsCommand - bIsCommand;

    // 2. Officers before NCMs
    const aIsOfficer = isOfficer(a.rank) ? 0 : 1;
    const bIsOfficer = isOfficer(b.rank) ? 0 : 1;
    if (aIsOfficer !== bIsOfficer) return aIsOfficer - bIsOfficer;

    // 3. Sort by rank (higher rank first)
    const rankDiff = getRankPriority(a.rank) - getRankPriority(b.rank);
    if (rankDiff !== 0) return rankDiff;

    // 4. Last name (alphabetical)
    const lastNameDiff = a.lastName.localeCompare(b.lastName);
    if (lastNameDiff !== 0) return lastNameDiff;

    // 5. First name (alphabetical)
    return a.firstName.localeCompare(b.firstName);
  });
}

/**
 * Alias for sortMembersByRank - used for backwards compatibility
 * @deprecated Use sortMembersByRank instead for clarity
 */
export const sortMembers = sortMembersByRank;
