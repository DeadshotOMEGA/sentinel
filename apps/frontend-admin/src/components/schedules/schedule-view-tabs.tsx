'use client'

/**
 * Tab switcher component for selecting schedule calendar view type.
 *
 * @example
 * ```tsx
 * const [view, setView] = useState<ScheduleView>('week')
 * <ScheduleViewTabs activeView={view} onViewChange={setView} />
 * ```
 */

export type ScheduleView = 'week' | 'month' | 'quarter'

interface ScheduleViewTabsProps {
  /** Currently active view */
  activeView: ScheduleView
  /** Callback when view changes */
  onViewChange: (view: ScheduleView) => void
}

export function ScheduleViewTabs({ activeView, onViewChange }: ScheduleViewTabsProps) {
  return (
    <div role="tablist" className="tabs tabs-box" aria-label="Schedule view options">
      <button
        role="tab"
        className={`tab ${activeView === 'week' ? 'tab-active' : ''}`}
        onClick={() => onViewChange('week')}
        aria-selected={activeView === 'week'}
        aria-controls="schedule-view-panel"
        type="button"
      >
        Week
      </button>
      <button
        role="tab"
        className={`tab ${activeView === 'month' ? 'tab-active' : ''}`}
        onClick={() => onViewChange('month')}
        aria-selected={activeView === 'month'}
        aria-controls="schedule-view-panel"
        type="button"
      >
        Month
      </button>
      <button
        role="tab"
        className={`tab ${activeView === 'quarter' ? 'tab-active' : ''}`}
        onClick={() => onViewChange('quarter')}
        aria-selected={activeView === 'quarter'}
        aria-controls="schedule-view-panel"
        type="button"
      >
        Quarter
      </button>
    </div>
  )
}
