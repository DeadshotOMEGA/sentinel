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

export type ScheduleView = 'week' | 'monthly'

interface ScheduleViewTabsProps {
  /** Currently active view */
  activeView: ScheduleView
  /** Callback when view changes */
  onViewChange: (view: ScheduleView) => void
}

export function ScheduleViewTabs({ activeView, onViewChange }: ScheduleViewTabsProps) {
  return (
    <div
      role="tablist"
      className="tabs tabs-box"
      aria-label="Schedule view options"
      data-help-id="schedules.view-tabs"
    >
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
        className={`tab ${activeView === 'monthly' ? 'tab-active' : ''}`}
        onClick={() => onViewChange('monthly')}
        aria-selected={activeView === 'monthly'}
        aria-controls="schedule-view-panel"
        type="button"
      >
        Monthly
      </button>
    </div>
  )
}
