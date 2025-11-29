import { useMemo } from 'react';
import type { PresentMember, ActiveVisitor } from '../hooks/usePresenceData';

interface DenseViewProps {
  present: number;
  absent: number;
  visitors: number;
  presentMembers: PresentMember[];
  activeVisitors: ActiveVisitor[];
}

const VISIT_TYPE_LABELS: Record<string, string> = {
  contractor: 'Contractor',
  recruitment: 'Recruitment',
  event: 'Event',
  official: 'Official',
  museum: 'Museum',
  other: 'Visitor',
} as const;

function getVisitTypeLabel(visitType: string): string {
  if (visitType in VISIT_TYPE_LABELS) {
    return VISIT_TYPE_LABELS[visitType];
  }
  return 'Visitor';
}

// RCN Rank priority (lower = higher rank) - from Canada.ca official structure
const RANK_PRIORITY: Record<string, number> = {
  // Flag Officers
  'Adm': 1, 'VAdm': 2, 'RAdm': 3, 'Cmdre': 4,
  // Senior Officers
  'Capt(N)': 5, 'Cdr': 6, 'LCdr': 7,
  // Junior Officers
  'Lt(N)': 8, 'SLt': 9, 'A/SLt': 10,
  // Subordinate Officer
  'NCdt': 11, 'OCdt': 11,
  // Senior NCMs
  'CPO1': 20, 'CPO2': 21, 'PO1': 22, 'PO2': 23,
  // Junior NCMs
  'MS': 30, 'LS': 31, 'AB': 32, 'OS': 33,
  'Civ': 99,
};

function getRankPriority(rank: string | null): number {
  if (!rank) return 100;
  const normalized = rank.trim();
  if (normalized in RANK_PRIORITY) return RANK_PRIORITY[normalized];
  const upperRank = normalized.toUpperCase();
  for (const [key, value] of Object.entries(RANK_PRIORITY)) {
    if (key.toUpperCase() === upperRank) return value;
  }
  return 50;
}

function isOfficer(rank: string | null): boolean {
  return getRankPriority(rank) <= 11;
}

function sortMembers(members: PresentMember[]): PresentMember[] {
  return [...members].sort((a, b) => {
    const aIsCommand = a.division === 'Command' ? 0 : 1;
    const bIsCommand = b.division === 'Command' ? 0 : 1;
    if (aIsCommand !== bIsCommand) return aIsCommand - bIsCommand;

    const aIsOfficer = isOfficer(a.rank) ? 0 : 1;
    const bIsOfficer = isOfficer(b.rank) ? 0 : 1;
    if (aIsOfficer !== bIsOfficer) return aIsOfficer - bIsOfficer;

    const rankDiff = getRankPriority(a.rank) - getRankPriority(b.rank);
    if (rankDiff !== 0) return rankDiff;

    const lastNameDiff = a.lastName.localeCompare(b.lastName);
    if (lastNameDiff !== 0) return lastNameDiff;

    return a.firstName.localeCompare(b.firstName);
  });
}

/**
 * Dense View - Optimized for 41-80 people
 * - Smaller person cards (~80px height)
 * - 8-column grid
 * - Stats shown in page header (not here)
 * - Fits ~64 people visible
 */
export function DenseView({
  presentMembers,
  activeVisitors,
}: DenseViewProps) {
  const hasMembers = presentMembers.length > 0;
  const hasVisitors = activeVisitors.length > 0;

  const { commandMembers, regularMembers } = useMemo(() => {
    const sorted = sortMembers(presentMembers);
    return {
      commandMembers: sorted.filter(m => m.division === 'Command'),
      regularMembers: sorted.filter(m => m.division !== 'Command'),
    };
  }, [presentMembers]);

  return (
    <div className="flex-1 overflow-auto">

      {!hasMembers && !hasVisitors ? (
        <div className="flex items-center justify-center h-64 bg-gray-50 rounded-xl">
          <p className="text-3xl text-gray-400">No one currently in building</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Active Visitors Section - Compact */}
          {hasVisitors && (
            <div>
              <h3 className="text-sm text-gray-500 mb-1.5 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                Visitors ({activeVisitors.length})
              </h3>
              <div className="grid grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-2">
                {activeVisitors.map((visitor) => (
                  <div
                    key={visitor.id}
                    className="border-l-3 border-l-sky-500 bg-white rounded-md shadow-sm px-2 py-2"
                  >
                    <p className="text-lg font-bold text-gray-900 truncate">
                      {visitor.name}
                    </p>
                    <p className="text-sm text-gray-700 truncate">
                      {visitor.organization}
                    </p>
                    <p className="text-xs text-sky-600">
                      {getVisitTypeLabel(visitor.visitType)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Command Members Section - Compact */}
          {commandMembers.length > 0 && (
            <div>
              <h3 className="text-sm text-gray-500 mb-1.5 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                Command ({commandMembers.length})
              </h3>
              <div className="grid grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-2">
                {commandMembers.map((member) => (
                  <div
                    key={member.id}
                    className="border-l-3 border-l-amber-500 bg-white rounded-md shadow-sm px-2 py-2"
                  >
                    <p className="text-lg font-bold text-gray-900 truncate">
                      {member.rank} {member.lastName}
                    </p>
                    <p className="text-sm text-gray-700 truncate">
                      {member.firstName}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Regular Members Section - Compact */}
          {regularMembers.length > 0 && (
            <div>
              <h3 className="text-sm text-gray-500 mb-1.5 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Members ({regularMembers.length})
              </h3>
              <div className="grid grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-2">
                {regularMembers.map((member) => (
                  <div
                    key={member.id}
                    className="border-l-3 border-l-emerald-500 bg-white rounded-md shadow-sm px-2 py-2"
                  >
                    <p className="text-lg font-bold text-gray-900 truncate">
                      {member.rank} {member.lastName}
                    </p>
                    <p className="text-sm text-gray-700 truncate">
                      {member.firstName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {member.division}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
