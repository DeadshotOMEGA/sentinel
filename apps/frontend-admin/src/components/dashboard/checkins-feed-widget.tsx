'use client'

import { Clock, ArrowDownCircle, ArrowUpCircle, UsersRound } from 'lucide-react'
import { useRecentCheckins } from '@/hooks/use-checkins'
import type { CheckinWithMemberResponse } from '@sentinel/contracts'

export function CheckinsFeedWidget() {
  const { data, isLoading, isError } = useRecentCheckins()

  if (isError) {
    return (
      <div className="bg-base-100 p-6 rounded-lg border shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-error" />
          <h2 className="text-lg font-semibold">Recent Check-ins</h2>
        </div>
        <p className="text-sm text-error">Failed to load check-ins</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="bg-base-100 p-6 rounded-lg border shadow-sm">
        <div className="animate-pulse">
          <div className="h-8 bg-base-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-2">
            <div className="h-12 bg-base-200 rounded"></div>
            <div className="h-12 bg-base-200 rounded"></div>
            <div className="h-12 bg-base-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  const checkins = data?.checkins ?? []

  return (
    <div className="bg-base-100 p-6 rounded-lg shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <UsersRound size={32} strokeWidth={1} />
        <h2 className="text-lg font-semibold">Presence</h2>
      </div>

      {checkins.length > 0 ? (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {checkins.slice(0, 10).map((checkin: CheckinWithMemberResponse) => {
            const isCheckIn = checkin.direction === 'in'
            const Icon = isCheckIn ? ArrowDownCircle : ArrowUpCircle
            const colorClass = isCheckIn ? 'text-success' : 'text-warning'

            return (
              <div
                key={checkin.id}
                className="flex items-center justify-between p-2 bg-base-200/50 rounded text-sm hover:bg-base-200 transition-colors"
              >
                <div className="flex items-center gap-2 flex-1">
                  <Icon className={`h-4 w-4 ${colorClass}`} />
                  <div>
                    <span className="font-medium">
                      {checkin.member
                        ? `${checkin.member.firstName} ${checkin.member.lastName}`
                        : 'Unknown Member'}
                    </span>
                    <span className={`ml-1 ${colorClass}`}>
                      {isCheckIn ? 'checked in' : 'checked out'}
                    </span>
                  </div>
                </div>
                <span className="text-base-content/60 text-xs">
                  {new Date(checkin.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )
          })}
        </div>
      ) : (
<div className="flex w-full grid-cols-6 gap-4">
<div className="flex w-52 flex-col gap-4">
  <div className="flex items-center gap-4">
    <div className="skeleton h-16 w-16 shrink-0 rounded-full"></div>
    <div className="flex flex-col gap-4">
      <div className="skeleton h-4 w-20"></div>
      <div className="skeleton h-4 w-28"></div>
    </div>
  </div>
  <div className="skeleton h-32 w-full"></div>
</div>
<div className="flex w-52 flex-col gap-4">
  <div className="flex items-center gap-4">
    <div className="skeleton h-16 w-16 shrink-0 rounded-full"></div>
    <div className="flex flex-col gap-4">
      <div className="skeleton h-4 w-20"></div>
      <div className="skeleton h-4 w-28"></div>
    </div>
  </div>
  <div className="skeleton h-32 w-full"></div>
</div>
<div className="flex w-52 flex-col gap-4">
  <div className="flex items-center gap-4">
    <div className="skeleton h-16 w-16 shrink-0 rounded-full"></div>
    <div className="flex flex-col gap-4">
      <div className="skeleton h-4 w-20"></div>
      <div className="skeleton h-4 w-28"></div>
    </div>
  </div>
  <div className="skeleton h-32 w-full"></div>
</div>
</div>
      )}
    </div>
  )
}
