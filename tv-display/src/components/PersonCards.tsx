import { useMemo } from 'react';
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

// Mess priority order (lower = higher priority)
const MESS_PRIORITY: Record<string, number> = {
  'Wardroom': 1,
  'C&POs': 2,
  'Junior Ranks': 3,
};

function getMessPriority(mess: string | null): number {
  if (!mess) return 99; // No mess = lowest priority
  return MESS_PRIORITY[mess] ?? 50;
}

// Sort members: Command division first, then by mess, then division, then name
function sortMembers(members: PresentMember[]): PresentMember[] {
  return [...members].sort((a, b) => {
    // 1. Command division first
    const aIsCommand = a.division === 'Command' ? 0 : 1;
    const bIsCommand = b.division === 'Command' ? 0 : 1;
    if (aIsCommand !== bIsCommand) return aIsCommand - bIsCommand;

    // 2. Mess priority (Wardroom > C&POs > Junior Ranks)
    const messDiff = getMessPriority(a.mess) - getMessPriority(b.mess);
    if (messDiff !== 0) return messDiff;

    // 3. Division name (alphabetical)
    const divisionDiff = a.division.localeCompare(b.division);
    if (divisionDiff !== 0) return divisionDiff;

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
        <p className="text-3xl text-gray-400">No one currently in building</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active Visitors Section */}
      {hasVisitors && (
        <div>
          <h3 className="text-base text-gray-600 mb-2 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-sky-500" />
            {activeVisitors.length}
          </h3>
          <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2">
            {activeVisitors.map((visitor) => (
              <div
                key={visitor.id}
                className="border-l-4 border-l-sky-500 bg-white rounded-lg shadow-sm p-2"
              >
                <p className="text-xl font-bold text-gray-900 truncate">
                  {visitor.name}
                </p>
                <p className="text-base text-gray-700 truncate">
                  {visitor.organization}
                </p>
                <p className="text-sm text-sky-600">
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
          <h3 className="text-base text-gray-600 mb-2 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            {commandMembers.length}
          </h3>
          <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2">
            {commandMembers.map((member) => (
              <div
                key={member.id}
                className="border-l-4 border-l-amber-500 bg-white rounded-lg shadow-sm p-2"
              >
                <p className="text-xl font-bold text-gray-900 truncate">
                  {member.rank} {member.lastName}
                </p>
                <p className="text-base text-gray-700 truncate">
                  {member.firstName}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regular Members Section */}
      {regularMembers.length > 0 && (
        <div>
          <h3 className="text-base text-gray-600 mb-2 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            {regularMembers.length}
          </h3>
          <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2">
            {regularMembers.map((member) => (
              <div
                key={member.id}
                className="border-l-4 border-l-emerald-500 bg-white rounded-lg shadow-sm p-2"
              >
                <p className="text-xl font-bold text-gray-900 truncate">
                  {member.rank} {member.lastName}
                </p>
                <p className="text-base text-gray-700 truncate">
                  {member.firstName}
                </p>
                <p className="text-sm text-gray-500">
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
