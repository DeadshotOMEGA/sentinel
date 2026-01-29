'use client'

import { Users } from 'lucide-react'
import { usePresence } from '@/hooks/use-presence'

export function PresenceStatsWidget() {
  const { data, isLoading, isError } = usePresence()

  if (isError) {
    return (
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <div className="flex items-center gap-2">
            <div className="btn btn-square btn-error btn-soft btn-sm no-animation">
              <Users className="h-5 w-5" />
            </div>
            <h2 className="card-title text-lg">Currently Present</h2>
          </div>
          <p className="text-sm text-error">Failed to load presence data</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body gap-4">
          <div className="skeleton h-10 w-10"></div>
          <div className="skeleton h-16 w-1/2"></div>
          <div className="skeleton h-4 w-1/3"></div>
        </div>
      </div>
    )
  }

  const totalPresent = data?.totalPresent ?? 0

  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">
        <div className="flex items-center gap-2 mb-2">
          <div className="btn btn-square btn-primary btn-soft btn-sm no-animation">
            <Users className="h-5 w-5" />
          </div>
          <h2 className="card-title text-lg">Currently Present</h2>
        </div>

        <div className="stat p-0">
          <div className="stat-value text-primary">{totalPresent}</div>
          <div className="stat-desc">
            {totalPresent === 1 ? 'member' : 'members'} on site
          </div>
        </div>
      </div>
    </div>
  )
}
