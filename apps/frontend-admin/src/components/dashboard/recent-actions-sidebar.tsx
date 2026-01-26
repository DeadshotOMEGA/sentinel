'use client'

import { useState } from 'react'
import { Clock, ArrowDownCircle, ArrowUpCircle, ChevronRight, ChevronLeft } from 'lucide-react'
import { useRecentCheckins } from '@/hooks/use-checkins'
import { Button } from '@/components/ui/button'
import type { CheckinWithMemberResponse } from '@sentinel/contracts'

export function RecentActionsSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { data, isLoading, isError } = useRecentCheckins()

  const checkins = data?.checkins ?? []

  return (
    <>
      {/* Collapsed pull tab button */}
      {isCollapsed && (
        <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40">
          <Button
            variant="outline"
            size="icon"
            className="rounded-l-lg rounded-r-none shadow-lg"
            onClick={() => setIsCollapsed(false)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Sidebar */}
      <div
        className={`fixed right-0 top-0 h-screen w-80 bg-card border-l transition-transform duration-300 ease-in-out z-50 ${
          isCollapsed ? 'translate-x-full' : 'translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="border-b">
            <div className="flex items-center justify-between h-16 px-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">Recent Actions</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(true)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {isError && <div className="text-sm text-destructive">Failed to load check-ins</div>}

            {isLoading && (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-12 bg-muted rounded"></div>
                  </div>
                ))}
              </div>
            )}

            {!isLoading && !isError && checkins.length > 0 && (
              <div className="space-y-2">
                {checkins.map((checkin: CheckinWithMemberResponse) => {
                  const isCheckIn = checkin.direction === 'in'
                  const Icon = isCheckIn ? ArrowDownCircle : ArrowUpCircle
                  const colorClass = isCheckIn ? 'text-green-600' : 'text-orange-600'

                  return (
                    <div
                      key={checkin.id}
                      className="p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <Icon className={`h-4 w-4 ${colorClass} flex-shrink-0 mt-0.5`} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {checkin.member
                              ? `${checkin.member.firstName} ${checkin.member.lastName}`
                              : 'Unknown Member'}
                          </div>
                          <div className={`text-sm ${colorClass}`}>
                            {isCheckIn ? 'Checked in' : 'Checked out'}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(checkin.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {!isLoading && !isError && checkins.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Clock className="h-12 w-12 mb-2 opacity-20" />
                <p className="text-sm">No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
