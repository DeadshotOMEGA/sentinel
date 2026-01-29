'use client'

import { CheckCircle2 } from 'lucide-react'
import { useDdsStatus } from '@/hooks/use-dds'

export function DdsStatusWidget() {
  const { data: ddsStatus, isLoading } = useDdsStatus()

  const getDdsStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <span className="badge badge-success">Accepted</span>
      case 'pending':
        return <span className="badge badge-ghost">Pending</span>
      case 'transferred':
        return <span className="badge badge-outline">Transferred</span>
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
        ) : ddsStatus?.assignment ? (
          <div className="space-y-3">
            <p className="font-semibold text-2xl">{ddsStatus.assignment.member.name}</p>
            <div className="flex items-center gap-2">
              {getDdsStatusBadge(ddsStatus.assignment.status)}
              <span className="text-sm text-base-content/60">
                {new Date(ddsStatus.assignment.assignedDate).toLocaleDateString()}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-base-content/60">No DDS assigned for today</p>
        )}
      </div>
    </div>
  )
}
