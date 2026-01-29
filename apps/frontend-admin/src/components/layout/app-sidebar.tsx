'use client'

import { Clock, ArrowDownCircle, ArrowUpCircle, PanelLeftClose } from 'lucide-react'
import { useRecentCheckins } from '@/hooks/use-checkins'
import type { CheckinWithMemberResponse } from '@sentinel/contracts'

interface AppSidebarProps {
  drawerId: string
}

export function AppSidebar({ drawerId }: AppSidebarProps) {
  const { data, isLoading, isError } = useRecentCheckins()
  const checkins = data?.checkins ?? []

  return (
    <div className="flex min-h-full w-80 flex-col bg-base-200 p-4">
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
          <span className="text-sm">Failed to load check-ins</span>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton h-16 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* Checkins List */}
      {!isLoading && !isError && checkins.length > 0 && (
        <ul className="menu menu-sm w-full flex-1 gap-1 overflow-y-auto p-0">
          {checkins.map((checkin: CheckinWithMemberResponse) => {
            const isCheckIn = checkin.direction === 'in'
            const Icon = isCheckIn ? ArrowDownCircle : ArrowUpCircle

            return (
              <li key={checkin.id}>
                <div className="flex items-start gap-2 rounded-lg bg-base-100 p-3">
                  <Icon
                    className={`mt-0.5 h-4 w-4 shrink-0 ${isCheckIn ? 'text-success' : 'text-warning'}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {checkin.member
                        ? `${checkin.member.firstName} ${checkin.member.lastName}`
                        : 'Unknown Member'}
                    </div>
                    <div
                      className={`text-xs ${isCheckIn ? 'text-success' : 'text-warning'}`}
                    >
                      {isCheckIn ? 'Checked in' : 'Checked out'}
                    </div>
                    <div className="mt-0.5 text-xs text-base-content/60">
                      {new Date(checkin.timestamp).toLocaleTimeString([], {
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
      {!isLoading && !isError && checkins.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center text-base-content/60">
          <Clock className="mb-2 h-12 w-12 opacity-20" />
          <p className="text-sm">No recent activity</p>
        </div>
      )}
    </div>
  )
}
