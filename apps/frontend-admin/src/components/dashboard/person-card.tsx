'use client'

import { Clock, User, Building2 } from 'lucide-react'
import type { PresentPerson } from '@sentinel/contracts'

function formatRelativeTime(isoString: string): string {
  const now = Date.now()
  const then = new Date(isoString).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin} min ago`
  const diffHrs = Math.floor(diffMin / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  return `${Math.floor(diffHrs / 24)}d ago`
}

interface PersonCardProps {
  person: PresentPerson
}

export function PersonCard({ person }: PersonCardProps) {
  const isMember = person.type === 'member'

  return (
    <div className="card bg-base-100 shadow-sm border border-base-300 hover:shadow-md transition-shadow">
      <div className="card-body p-4 gap-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {isMember ? (
              <>
                <h3 className="font-bold text-sm truncate">
                  {person.rank} {person.name.split(' ').pop()}
                </h3>
                <p className="text-xs text-base-content/60 truncate">
                  {person.name.split(' ').slice(0, -1).join(' ')}
                </p>
              </>
            ) : (
              <>
                <h3 className="font-bold text-sm truncate">{person.name}</h3>
                {person.organization && (
                  <p className="text-xs text-base-content/60 truncate">
                    {person.organization}
                  </p>
                )}
              </>
            )}
          </div>
          <div className={`badge badge-sm shrink-0 ${isMember ? 'badge-success' : 'badge-info'}`}>
            {isMember ? 'Member' : 'Visitor'}
          </div>
        </div>

        {/* Body - tags for members, visit info for visitors */}
        <div className="min-h-[1.5rem]">
          {isMember ? (
            <div className="flex flex-wrap gap-1">
              {person.division && (
                <span className="badge badge-outline badge-xs">{person.division}</span>
              )}
              {person.tags?.map((tag) => (
                <span
                  key={tag.id}
                  className="badge badge-xs"
                  style={{ backgroundColor: tag.color, color: '#fff' }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-0.5 text-xs text-base-content/70">
              {person.eventName && (
                <span className="flex items-center gap-1">
                  <Building2 size={10} />
                  {person.eventName}
                </span>
              )}
              {person.hostName && (
                <span className="flex items-center gap-1">
                  <User size={10} />
                  Host: {person.hostName}
                </span>
              )}
              {!person.eventName && !person.hostName && person.visitReason && (
                <span className="truncate">{person.visitReason}</span>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-1 text-xs text-base-content/50 mt-auto pt-1 border-t border-base-200">
          <Clock size={10} />
          <span>{formatRelativeTime(person.checkInTime)}</span>
        </div>
      </div>
    </div>
  )
}
