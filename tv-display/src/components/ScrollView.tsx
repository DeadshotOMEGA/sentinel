import { useMemo, useEffect, useState } from 'react';
import type { PresentMember, ActiveVisitor } from '../hooks/usePresenceData';

interface ScrollViewProps {
  present: number;
  presentMembers: PresentMember[];
  activeVisitors: ActiveVisitor[];
}

const MESS_PRIORITY: Record<string, number> = {
  'Wardroom': 1,
  'C&POs': 2,
  'Junior Ranks': 3,
};

function getMessPriority(mess: string | null): number {
  if (!mess) return 99;
  return MESS_PRIORITY[mess] ?? 50;
}

function sortMembers(members: PresentMember[]): PresentMember[] {
  return [...members].sort((a, b) => {
    const aIsCommand = a.division === 'Command' ? 0 : 1;
    const bIsCommand = b.division === 'Command' ? 0 : 1;
    if (aIsCommand !== bIsCommand) return aIsCommand - bIsCommand;

    const messDiff = getMessPriority(a.mess) - getMessPriority(b.mess);
    if (messDiff !== 0) return messDiff;

    const divisionDiff = a.division.localeCompare(b.division);
    if (divisionDiff !== 0) return divisionDiff;

    const lastNameDiff = a.lastName.localeCompare(b.lastName);
    if (lastNameDiff !== 0) return lastNameDiff;

    return a.firstName.localeCompare(b.firstName);
  });
}

/**
 * Scroll View - Optimized for 80+ people
 * - Large prominent count header
 * - Continuous vertical auto-scroll (movie credits style)
 * - Scroll speed adjusts based on list length
 * - Seamless loop
 */
export function ScrollView({
  present,
  presentMembers,
  activeVisitors,
}: ScrollViewProps) {
  const [isPaused, setIsPaused] = useState(false);

  const sortedMembers = useMemo(() => sortMembers(presentMembers), [presentMembers]);

  // Calculate scroll duration based on total count (more people = faster)
  // Base: 40s for 80 people, scales linearly
  const totalCount = sortedMembers.length + activeVisitors.length;
  const scrollDuration = Math.max(30, Math.min(90, totalCount * 0.5));

  // Pause briefly on new data
  useEffect(() => {
    setIsPaused(true);
    const timer = setTimeout(() => setIsPaused(false), 2000);
    return () => clearTimeout(timer);
  }, [present]);

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Large prominent count header */}
      <div
        className="bg-gradient-to-r from-green-100 via-emerald-100 to-green-100 border-b-4 border-green-500 px-8 py-8 text-center shadow-lg"
        role="region"
        aria-label="Attendance summary"
      >
        <div className="flex items-center justify-center gap-4" aria-live="polite" aria-atomic="true">
          <span className="text-8xl font-bold text-green-700">{present}</span>
          <span className="text-5xl font-semibold text-gray-700">Present</span>
        </div>
        <p className="text-2xl text-gray-600 mt-2">
          {sortedMembers.length} {sortedMembers.length === 1 ? 'Member' : 'Members'}
          {activeVisitors.length > 0 && ` • ${activeVisitors.length} ${activeVisitors.length === 1 ? 'Visitor' : 'Visitors'}`}
        </p>
      </div>

      {/* Scrolling names container */}
      <div
        className="flex-1 relative overflow-hidden bg-gradient-to-b from-gray-50 to-white"
        role="region"
        aria-label="Present personnel list"
      >
        <div
          className={`scroll-container ${isPaused ? 'paused' : ''}`}
          style={{
            animationDuration: `${scrollDuration}s`,
          }}
        >
          {/* First instance of list */}
          <div className="space-y-1 py-4">
            {activeVisitors.length > 0 && (
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-sky-700 mb-3 px-8 flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-sky-500" aria-hidden="true" />
                  Visitors
                </h2>
                {activeVisitors.map((visitor) => (
                  <div
                    key={`a-${visitor.id}`}
                    className="px-8 py-3 hover:bg-sky-50 transition-colors"
                  >
                    <p className="text-3xl font-semibold text-gray-900">
                      {visitor.name}
                    </p>
                    <p className="text-xl text-gray-600">
                      {visitor.organization}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {sortedMembers.length > 0 && (
              <div>
                <h2 className="text-3xl font-bold text-emerald-700 mb-3 px-8 flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-500" aria-hidden="true" />
                  Members
                </h2>
                {sortedMembers.map((member) => (
                  <div
                    key={`a-${member.id}`}
                    className="px-8 py-3 hover:bg-emerald-50 transition-colors"
                  >
                    <p className="text-3xl font-semibold text-gray-900">
                      {member.rank} {member.firstName} {member.lastName}
                    </p>
                    <p className="text-xl text-gray-600">
                      {member.division}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Duplicate for seamless loop */}
          <div className="space-y-1 py-4" aria-hidden="true">
            {activeVisitors.length > 0 && (
              <div className="mb-6">
                <h3 className="text-3xl font-bold text-sky-700 mb-3 px-8 flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-sky-500" />
                  Visitors
                </h3>
                {activeVisitors.map((visitor) => (
                  <div
                    key={`b-${visitor.id}`}
                    className="px-8 py-3 hover:bg-sky-50 transition-colors"
                  >
                    <p className="text-3xl font-semibold text-gray-900">
                      {visitor.name}
                    </p>
                    <p className="text-xl text-gray-600">
                      {visitor.organization}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {sortedMembers.length > 0 && (
              <div>
                <h3 className="text-3xl font-bold text-emerald-700 mb-3 px-8 flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-500" />
                  Members
                </h3>
                {sortedMembers.map((member) => (
                  <div
                    key={`b-${member.id}`}
                    className="px-8 py-3 hover:bg-emerald-50 transition-colors"
                  >
                    <p className="text-3xl font-semibold text-gray-900">
                      {member.rank} {member.firstName} {member.lastName}
                    </p>
                    <p className="text-xl text-gray-600">
                      {member.division}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scroll-credits {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(-50%);
          }
        }

        .scroll-container {
          animation: scroll-credits linear infinite;
        }

        .scroll-container.paused {
          animation-play-state: paused;
        }

        @media (prefers-reduced-motion: reduce) {
          .scroll-container {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
