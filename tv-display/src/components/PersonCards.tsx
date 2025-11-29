import { useMemo } from 'react';
import { Textfit } from 'react-textfit';
import type { PresentMember, ActiveVisitor } from '../hooks/usePresenceData';

interface PersonCardsProps {
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
// Officers first, then NCMs
const RANK_PRIORITY: Record<string, number> = {
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

function getRankPriority(rank: string | null): number {
  if (!rank) return 100;
  // Normalize rank: trim whitespace, handle common variations
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

function isOfficer(rank: string | null): boolean {
  const priority = getRankPriority(rank);
  return priority <= 11; // Officers are priority 1-11
}

// Sort members: Officers by rank, then NCMs by rank, then by name
function sortMembers(members: PresentMember[]): PresentMember[] {
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

export function PersonCards({ presentMembers, activeVisitors }: PersonCardsProps) {
  const hasMembers = presentMembers.length > 0;
  const hasVisitors = activeVisitors.length > 0;

  // Sort and split members with memoization
  const { commandMembers, regularMembers } = useMemo(() => {
    const sorted = sortMembers(presentMembers);
    return {
      commandMembers: sorted.filter(m => m.division === 'Command'),
      regularMembers: sorted.filter(m => m.division !== 'Command'),
    };
  }, [presentMembers]);

  if (!hasMembers && !hasVisitors) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-xl">
        <p className="text-4xl text-gray-400">No one currently in building</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active Visitors Section */}
      {hasVisitors && (
        <div>
          <h3 className="text-sm text-gray-500 mb-1.5 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
            Visitors ({activeVisitors.length})
          </h3>
          <div className="grid grid-cols-5 gap-2">
            {activeVisitors.map((visitor) => (
              <div
                key={visitor.id}
                className="border-l-3 border-l-sky-500 bg-white rounded-md shadow-sm px-2 py-1.5 min-w-0"
              >
                <Textfit mode="single" max={16} className="font-bold text-gray-900 h-5">
                  {visitor.name}
                </Textfit>
                <Textfit mode="single" max={14} className="text-gray-700 h-4">
                  {visitor.organization}
                </Textfit>
                <p className="text-xs text-sky-600">
                  {getVisitTypeLabel(visitor.visitType)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Command Members Section */}
      {commandMembers.length > 0 && (
        <div>
          <h3 className="text-sm text-gray-500 mb-1.5 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            Command ({commandMembers.length})
          </h3>
          <div className="grid grid-cols-5 gap-2">
            {commandMembers.map((member) => (
              <div
                key={member.id}
                className="border-l-3 border-l-amber-500 bg-white rounded-md shadow-sm px-2 py-1.5 min-w-0"
              >
                <Textfit mode="single" max={16} className="font-bold text-gray-900 h-5">
                  {member.rank} {member.lastName}
                </Textfit>
                <Textfit mode="single" max={14} className="text-gray-700 h-4">
                  {member.firstName}
                </Textfit>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regular Members Section */}
      {regularMembers.length > 0 && (
        <div>
          <h3 className="text-sm text-gray-500 mb-1.5 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            Members ({regularMembers.length})
          </h3>
          <div className="grid grid-cols-5 gap-2">
            {regularMembers.map((member) => (
              <div
                key={member.id}
                className="border-l-3 border-l-emerald-500 bg-white rounded-md shadow-sm px-2 py-1.5 min-w-0"
              >
                <Textfit mode="single" max={16} className="font-bold text-gray-900 h-5">
                  {member.rank} {member.lastName}
                </Textfit>
                <Textfit mode="single" max={14} className="text-gray-700 h-4">
                  {member.firstName}
                </Textfit>
                <p className="text-xs text-gray-500">
                  {member.division}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
