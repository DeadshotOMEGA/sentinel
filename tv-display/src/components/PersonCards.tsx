import { useMemo } from 'react';
import { Textfit } from 'react-textfit';
import { sortMembersByRank } from '@sentinel/ui';
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

export function PersonCards({ presentMembers, activeVisitors }: PersonCardsProps) {
  const hasMembers = presentMembers.length > 0;
  const hasVisitors = activeVisitors.length > 0;

  // Sort and split members with memoization
  const { commandMembers, regularMembers } = useMemo(() => {
    const sorted = sortMembersByRank(presentMembers);
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
          <h2 className="text-sm text-gray-500 mb-1.5 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" aria-hidden="true" />
            Visitors ({activeVisitors.length})
          </h2>
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
          <h2 className="text-sm text-gray-500 mb-1.5 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" aria-hidden="true" />
            Command ({commandMembers.length})
          </h2>
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
          <h2 className="text-sm text-gray-500 mb-1.5 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" aria-hidden="true" />
            Members ({regularMembers.length})
          </h2>
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
