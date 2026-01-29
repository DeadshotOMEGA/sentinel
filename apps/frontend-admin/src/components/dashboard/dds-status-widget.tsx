'use client'

import { CheckCircle2 } from 'lucide-react'
import { useCurrentDds } from '@/hooks/use-schedules'

export function DdsStatusWidget() {
  const { data, isLoading } = useCurrentDds()

  const dds = data?.dds ?? null

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <span className="badge badge-success">Confirmed</span>
      case 'assigned':
        return <span className="badge badge-ghost">Assigned</span>
      case 'released':
        return <span className="badge">Released</span>
      default:
        return <span className="badge badge-ghost">{status}</span>
    }
  }

  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">
        <div className="flex items-center gap-2 mb-2">
          <div className="btn btn-square btn-primary btn-soft btn-sm no-animation">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <h2 className="card-title text-lg">Daily Duty Staff</h2>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <div className="skeleton h-6 w-2/3"></div>
            <div className="skeleton h-8 w-1/2"></div>
          </div>
        ) : dds ? (
          <div className="space-y-3">
            <p className="font-semibold text-2xl">
              {dds.member.rank} {dds.member.firstName} {dds.member.lastName}
            </p>
            <div className="flex items-center gap-2">
              {getStatusBadge(dds.status)}
              <span className="text-sm text-base-content/60">
                Week of {dds.weekStartDate}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-base-content/60">No DDS assigned for this week</p>
        )}
      </div>
    </div>
  )
}
