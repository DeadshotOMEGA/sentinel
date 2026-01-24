'use client'

import { Clock, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { useRecentCheckins } from '@/hooks/use-checkins'
import type { CheckinWithMemberResponse } from '@sentinel/contracts'

export function CheckinsFeedWidget() {
  const { data, isLoading, isError } = useRecentCheckins()

  if (isError) {
    return (
      <div className="bg-card p-6 rounded-lg border shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-destructive" />
          <h2 className="text-lg font-semibold">Recent Check-ins</h2>
        </div>
        <p className="text-sm text-destructive">Failed to load check-ins</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="bg-card p-6 rounded-lg border shadow-sm">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="space-y-2">
            <div className="h-12 bg-muted rounded"></div>
            <div className="h-12 bg-muted rounded"></div>
            <div className="h-12 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  const checkins = data?.checkins ?? []

  return (
    <div className="bg-card p-6 rounded-lg border shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Recent Check-ins</h2>
      </div>

      {checkins.length > 0 ? (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {checkins.slice(0, 10).map((checkin: CheckinWithMemberResponse) => {
            const isCheckIn = checkin.direction === 'in'
            const Icon = isCheckIn ? ArrowDownCircle : ArrowUpCircle
            const colorClass = isCheckIn ? 'text-green-600' : 'text-orange-600'

            return (
              <div
                key={checkin.id}
                className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm hover:bg-muted transition-colors"
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
                <span className="text-muted-foreground text-xs">
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
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Clock className="h-12 w-12 mb-2 opacity-20" />
          <p className="text-sm">No recent activity</p>
        </div>
      )}
    </div>
  )
}
