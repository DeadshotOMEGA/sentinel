'use client'

import { Clock, ArrowDownCircle, ArrowUpCircle, PanelLeftClose } from 'lucide-react'
import { useRecentActivity } from '@/hooks/use-checkins'
import type { RecentActivityItem } from '@sentinel/contracts'

interface AppSidebarProps {
  drawerId: string
}

export function AppSidebar({ drawerId }: AppSidebarProps) {
  const { data, isLoading, isError } = useRecentActivity()
  const activities = data?.activities ?? []

  return (
    <div className="flex min-h-full w-72.5 flex-col bg-base-300 p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 shrink-0 text-primary" />
          <h2 className="font-semibold whitespace-nowrap">Recent Activity</h2>
        </div>
        {/* Close button - visible on desktop */}
        <label
          htmlFor={drawerId}
          aria-label="close sidebar"
          className="btn btn-ghost btn-sm btn-square hidden lg:flex"
          data-tip="Close sidebar"
        >
          <PanelLeftClose className="h-4 w-4" />
        </label>
      </div>

      {/* Error State */}
      {isError && (
        <div className="alert alert-error">
          <span className="text-sm">Failed to load recent activity</span>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton h-16 w-full" />
          ))}
        </div>
      )}

      {/* Activity List */}
      {!isLoading && !isError && activities.length > 0 && (
        <ul className="menu menu-sm w-full flex-1 gap-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden p-0">
          {activities.map((item: RecentActivityItem) => {
            const isCheckIn = item.direction === 'in'
            const isVisitor = item.type === 'visitor'
            const Icon = isCheckIn ? ArrowDownCircle : ArrowUpCircle

            return (
              <li key={`${item.type}-${item.id}`}>
                <div className="flex items-start gap-2 bg-base-100 p-3 rounded-none">
                  <Icon
                    className={`mt-0.5 h-4 w-4 shrink-0 ${isCheckIn ? 'text-success' : 'text-warning'}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium">
                        {item.rank ? `${item.rank} ` : ''}
                        {item.name}
                      </span>
                      {isVisitor && (
                        <span className="badge badge-info badge-xs shrink-0">Visitor</span>
                      )}
                    </div>
                    <span
                      className={`badge badge-xs ${isCheckIn ? 'badge-success' : 'badge-error'}`}
                    >
                      {isCheckIn ? 'Signed in' : 'Signed out'}
                    </span>
                    <div className="mt-0.5 text-xs text-base-content/60">
                      {new Date(item.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* Empty State */}
      {!isLoading && !isError && activities.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center text-base-content/60">
          <Clock className="mb-2 h-12 w-12 opacity-20" />
          <p className="text-sm">No recent activity</p>
        </div>
      )}
    </div>
  )
}
