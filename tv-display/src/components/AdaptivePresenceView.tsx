import { useState, useEffect } from 'react';
import { CompactView } from './CompactView';
import { DenseView } from './DenseView';
import { ScrollView } from './ScrollView';
import type { PresentMember, ActiveVisitor } from '../hooks/usePresenceData';

interface AdaptivePresenceViewProps {
  present: number;
  absent: number;
  visitors: number;
  presentMembers: PresentMember[];
  activeVisitors: ActiveVisitor[];
}

type DisplayMode = 'compact' | 'dense' | 'scroll';

/**
 * Adaptive Presence View - Orchestrator that picks the right display mode
 * based on attendance count with hysteresis to prevent flickering
 *
 * Mode thresholds:
 * - Compact: ≤40 people
 * - Dense: 41-80 people
 * - Scroll: 80+ people
 *
 * Hysteresis prevents flickering at boundaries:
 * - Switch up at threshold
 * - Switch down at threshold-5
 */
export function AdaptivePresenceView({
  present,
  absent,
  visitors,
  presentMembers,
  activeVisitors,
}: AdaptivePresenceViewProps) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('compact');
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Determine display mode with hysteresis
  useEffect(() => {
    const totalPresent = presentMembers.length + activeVisitors.length;
    let newMode: DisplayMode = displayMode;

    if (displayMode === 'compact') {
      if (totalPresent > 40) {
        newMode = totalPresent > 80 ? 'scroll' : 'dense';
      }
    } else if (displayMode === 'dense') {
      if (totalPresent <= 35) {
        newMode = 'compact';
      } else if (totalPresent > 80) {
        newMode = 'scroll';
      }
    } else if (displayMode === 'scroll') {
      if (totalPresent <= 75) {
        newMode = totalPresent <= 35 ? 'compact' : 'dense';
      }
    }

    if (newMode !== displayMode) {
      setIsTransitioning(true);
      setTimeout(() => {
        setDisplayMode(newMode);
        setTimeout(() => setIsTransitioning(false), 50);
      }, 150);
    }
  }, [presentMembers.length, activeVisitors.length, displayMode]);

  const containerClass = `
    transition-opacity duration-300
    ${isTransitioning ? 'opacity-0' : 'opacity-100'}
  `;

  return (
    <div className={containerClass}>
      {displayMode === 'compact' && (
        <CompactView
          present={present}
          absent={absent}
          visitors={visitors}
          presentMembers={presentMembers}
          activeVisitors={activeVisitors}
        />
      )}
      {displayMode === 'dense' && (
        <DenseView
          present={present}
          absent={absent}
          visitors={visitors}
          presentMembers={presentMembers}
          activeVisitors={activeVisitors}
        />
      )}
      {displayMode === 'scroll' && (
        <ScrollView
          present={present}
          presentMembers={presentMembers}
          activeVisitors={activeVisitors}
        />
      )}
    </div>
  );
}
