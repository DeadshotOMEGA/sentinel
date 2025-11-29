import { PersonCards } from './PersonCards';
import type { PresentMember, ActiveVisitor } from '../hooks/usePresenceData';

interface CompactViewProps {
  present: number;
  absent: number;
  visitors: number;
  presentMembers: PresentMember[];
  activeVisitors: ActiveVisitor[];
}

/**
 * Compact View - Optimized for ≤40 people
 * - Current person card size
 * - 6-column grid (responsive)
 * - Stats shown in page header (not here)
 * - All present people visible
 */
export function CompactView({
  presentMembers,
  activeVisitors,
}: CompactViewProps) {
  return (
    <div className="flex-1 overflow-auto">
      <PersonCards
        presentMembers={presentMembers}
        activeVisitors={activeVisitors}
      />
    </div>
  );
}
