import { useMemo } from 'react';
import { sortMembersByRank } from '@sentinel/ui';
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
    const sorted = sortMembersByRank(presentMembers);
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
              <h2 className="text-sm text-gray-500 mb-1.5 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500" aria-hidden="true" />
                Visitors ({activeVisitors.length})
              </h2>
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
              <h2 className="text-sm text-gray-500 mb-1.5 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" aria-hidden="true" />
                Command ({commandMembers.length})
              </h2>
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
              <h2 className="text-sm text-gray-500 mb-1.5 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" aria-hidden="true" />
                Members ({regularMembers.length})
              </h2>
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
