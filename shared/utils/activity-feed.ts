/**
 * Activity Feed Utilities
 *
 * Framework-agnostic utilities for processing activity feed data.
 * Used by ActivityPanel and CollapsibleActivityPanel components.
 */

import type { ActivityItem, DashboardFilters } from '../types';

/** Direction types for activity items */
export type ActivityDirection = 'in' | 'out';

/** Type filter options */
export type ActivityTypeFilter = 'all' | 'members' | 'visitors';

/** Direction filter options */
export type ActivityDirectionFilter = 'all' | 'in' | 'out';

/** Visit type labels for display */
export const VISIT_TYPE_LABELS: Record<string, string> = {
  contractor: 'Contractor',
  recruitment: 'Recruitment',
  event: 'Event',
  official: 'Official',
  museum: 'Museum',
  other: 'Other',
};

/**
 * Filter activity items based on type, direction, and search query.
 * @param activity - Array of activity items
 * @param filters - Filter criteria
 * @returns Filtered activity items
 */
export function filterActivityItems(
  activity: ActivityItem[],
  filters: Pick<DashboardFilters, 'typeFilter' | 'directionFilter' | 'searchQuery'>
): ActivityItem[] {
  return activity.filter((item) => {
    // Type filter
    if (filters.typeFilter === 'members' && item.type !== 'checkin') return false;
    if (filters.typeFilter === 'visitors' && item.type !== 'visitor') return false;

    // Direction filter
    if (filters.directionFilter !== 'all' && item.direction !== filters.directionFilter) {
      return false;
    }

    // Search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const nameMatch = item.name.toLowerCase().includes(query);
      const rankMatch = item.rank?.toLowerCase().includes(query) ?? false;
      const divisionMatch = item.division?.toLowerCase().includes(query) ?? false;
      const organizationMatch = item.organization?.toLowerCase().includes(query) ?? false;

      if (!nameMatch && !rankMatch && !divisionMatch && !organizationMatch) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Get the border color class for an activity item based on direction.
 * @param direction - 'in' or 'out'
 * @returns Tailwind border color class
 */
export function getActivityBorderColor(direction: ActivityDirection): string {
  return direction === 'in' ? 'border-l-success' : 'border-l-warning';
}

/**
 * Get the HeroUI badge color for an activity item based on direction.
 * @param direction - 'in' or 'out'
 * @returns HeroUI color name
 */
export function getActivityBadgeColor(direction: ActivityDirection): 'success' | 'warning' {
  return direction === 'in' ? 'success' : 'warning';
}

/**
 * Get the badge label for an activity item based on direction.
 * @param direction - 'in' or 'out'
 * @returns Display label
 */
export function getActivityBadgeLabel(direction: ActivityDirection): string {
  return direction === 'in' ? 'Check-In' : 'Check-Out';
}

/**
 * Get secondary information line for an activity item.
 * Shows division/kiosk for members, organization/visit type/kiosk for visitors.
 * @param item - Activity item
 * @returns Secondary info string with parts joined by ' . '
 */
export function getActivitySecondaryInfo(item: ActivityItem): string {
  if (item.type === 'checkin') {
    // Member: show division and kiosk
    const parts: string[] = [];
    if (item.division) parts.push(item.division);
    if (item.kioskName) parts.push(item.kioskName);
    return parts.join(' \u2022 ');
  }

  // Visitor: show organization and visit details
  const parts: string[] = [];
  if (item.organization) parts.push(item.organization);
  if (item.visitType) {
    parts.push(VISIT_TYPE_LABELS[item.visitType] ?? item.visitType);
  }
  if (item.kioskName) parts.push(item.kioskName);
  return parts.join(' \u2022 ');
}

/**
 * Get additional visitor details if available.
 * Shows visit reason, host, and event information.
 * @param item - Activity item
 * @returns Visitor details string or null if not a visitor or no details
 */
export function getVisitorDetails(item: ActivityItem): string | null {
  if (item.type !== 'visitor') return null;

  const parts: string[] = [];
  if (item.visitReason) parts.push(item.visitReason);
  if (item.hostName) parts.push(`Host: ${item.hostName}`);
  if (item.eventName) parts.push(`Event: ${item.eventName}`);

  return parts.length > 0 ? parts.join(' \u2022 ') : null;
}
