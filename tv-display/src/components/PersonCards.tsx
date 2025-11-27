import { formatDistanceToNow } from 'date-fns';
import type { PresentMember, ActiveVisitor } from '../hooks/usePresenceData';

interface PersonCardsProps {
  presentMembers: PresentMember[];
  activeVisitors: ActiveVisitor[];
}

function formatTime(timestamp: string): string {
  return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
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

  if (!hasMembers && !hasVisitors) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-xl">
        <p className="text-3xl text-gray-400">No one currently in building</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Present Members Section */}
      {hasMembers && (
        <div>
          <h3 className="text-2xl font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-emerald-500" />
            Present Members ({presentMembers.length})
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
            {presentMembers.map((member) => (
              <div
                key={member.id}
                className="border-l-4 border-l-emerald-500 bg-white rounded-lg shadow-sm p-3"
              >
                <p className="text-2xl font-bold text-gray-900 truncate">
                  {member.rank} {member.lastName}
                </p>
                <p className="text-lg text-gray-700 truncate">
                  {member.firstName}
                </p>
                <p className="text-base text-gray-500 mt-1">
                  {member.division}
                </p>
                <p className="text-sm text-gray-400">
                  {formatTime(member.checkedInAt)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Visitors Section */}
      {hasVisitors && (
        <div>
          <h3 className="text-2xl font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-sky-500" />
            Visitors ({activeVisitors.length})
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
            {activeVisitors.map((visitor) => (
              <div
                key={visitor.id}
                className="border-l-4 border-l-sky-500 bg-white rounded-lg shadow-sm p-3"
              >
                <p className="text-2xl font-bold text-gray-900 truncate">
                  {visitor.name}
                </p>
                <p className="text-lg text-gray-700 truncate">
                  {visitor.organization}
                </p>
                <p className="text-base text-sky-600 mt-1">
                  {getVisitTypeLabel(visitor.visitType)}
                </p>
                <p className="text-sm text-gray-400">
                  {formatTime(visitor.checkInTime)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
