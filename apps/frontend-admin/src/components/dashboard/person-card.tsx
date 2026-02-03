'use client'

import { memo } from 'react'
import { Clock, User, Building2, LogOut } from 'lucide-react'
import { Chip, type ChipColor, type ChipVariant } from '@/components/ui/chip'
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

// Position color mapping for duty watch roles
const POSITION_COLORS: Record<string, string> = {
  SWK: 'bg-primary text-primary-content',
  DSWK: 'bg-info text-info-content',
  QM: 'bg-secondary text-secondary-content',
  BM: 'bg-accent text-accent-content',
  APS: 'bg-neutral text-neutral-content',
}

// Map chipColor to avatar background/text classes
const CHIP_COLOR_AVATAR_CLASSES: Record<string, string> = {
  default: 'bg-zinc-200 text-zinc-800',
  primary: 'bg-primary text-primary-content',
  secondary: 'bg-secondary text-secondary-content',
  success: 'bg-emerald-500 text-white',
  warning: 'bg-amber-500 text-white',
  danger: 'bg-red-500 text-white',
  blue: 'bg-blue-500 text-white',
  green: 'bg-green-500 text-white',
  pink: 'bg-pink-500 text-white',
  purple: 'bg-purple-500 text-white',
  red: 'bg-red-500 text-white',
  yellow: 'bg-yellow-500 text-white',
  cyan: 'bg-cyan-500 text-white',
  zinc: 'bg-zinc-500 text-white',
}

interface PersonAvatarProps {
  person: PresentPerson
  dutyPosition?: string | null
}

function PersonAvatar({ person, dutyPosition }: PersonAvatarProps) {
  // Priority 1: Duty position
  if (dutyPosition) {
    const colorClass = POSITION_COLORS[dutyPosition] || 'bg-base-300 text-base-content'
    return (
      <div className="avatar avatar-placeholder" aria-label={`On duty as ${dutyPosition}`}>
        <div className={`w-10 rounded-full ${colorClass}`}>
          <span className="text-xs font-bold">{dutyPosition}</span>
        </div>
      </div>
    )
  }

  // Priority 2: First tag (for members)
  if (person.type === 'member' && person.tags?.[0]) {
    const tag = person.tags[0]
    const abbrev = tag.name.match(/[A-Z]/g)?.join('') || tag.name.slice(0, 2).toUpperCase()
    const colorClass = tag.chipColor
      ? CHIP_COLOR_AVATAR_CLASSES[tag.chipColor] || CHIP_COLOR_AVATAR_CLASSES.default
      : CHIP_COLOR_AVATAR_CLASSES.default
    return (
      <div className="avatar avatar-placeholder" aria-label={`Tagged as ${tag.name}`}>
        <div className={`w-10 rounded-full ${colorClass}`}>
          <span className="text-xs font-bold">{abbrev}</span>
        </div>
      </div>
    )
  }

  // Priority 3: Default initials (for members without tags)
  const initials = person.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return (
    <div className="avatar avatar-placeholder" aria-label={person.name}>
      <div className="w-10 rounded-full bg-base-300 text-base-content">
        <span className="text-xs font-bold">{initials}</span>
      </div>
    </div>
  )
}

interface PersonCardProps {
  person: PresentPerson
  dutyPosition?: string | null
  onCheckoutVisitor?: (id: string) => void
}

export const PersonCard = memo(function PersonCard({
  person,
  dutyPosition,
  onCheckoutVisitor,
}: PersonCardProps) {
  const isMember = person.type === 'member'

  // Card border color: subtle indicator for member vs visitor
  const cardBorderClass = isMember
    ? 'border-success/30 hover:border-success/50'
    : 'border-info/30 hover:border-info/50'

  return (
    <div className={`card card-elevated rounded-xl border ${cardBorderClass}`}>
      <div className="card-body p-4 gap-3">
        {/* Header - different layout for member vs visitor */}
        {isMember ? (
          <div className="flex items-start gap-3">
            <PersonAvatar person={person} dutyPosition={dutyPosition} />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm truncate">
                {person.rank} {person.name.split(' ').pop()}
              </h3>
              <p className="text-xs text-base-content/60 truncate">
                {person.name.split(' ').slice(0, -1).join(' ')}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm truncate">{person.name}</h3>
              {person.organization && (
                <p className="text-xs text-base-content/60 truncate">
                  {person.organization}
                </p>
              )}
            </div>
            {person.visitType && (
              <Chip
                size="sm"
                variant={(person.visitType.chipVariant as ChipVariant) || 'faded'}
                color={(person.visitType.chipColor as ChipColor) || 'default'}
                className="chip-enhanced shrink-0"
              >
                {person.visitType.name}
              </Chip>
            )}
          </div>
        )}

        {/* Body - tags for members, visit info for visitors */}
        <div className="min-h-[1.5rem]">
          {isMember ? (
            <div className="flex flex-wrap gap-1.5">
              {person.tags?.map((tag) => (
                <Chip
                  key={tag.id}
                  size="sm"
                  variant="faded"
                  color={(tag.chipColor as ChipColor) || 'default'}
                  className="chip-enhanced"
                >
                  {tag.name}
                </Chip>
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
        <div className="flex items-center justify-between gap-1 text-xs text-base-content/50 mt-auto pt-1 border-t border-base-200">
          <div className="flex items-center gap-1">
            <Clock size={10} />
            <span>{formatRelativeTime(person.checkInTime)}</span>
          </div>
          {!isMember && onCheckoutVisitor && (
            <button
              type="button"
              className="btn btn-ghost btn-xs text-error gap-1"
              onClick={() => onCheckoutVisitor(person.id)}
            >
              <LogOut size={10} />
              Sign Out
            </button>
          )}
        </div>
      </div>
    </div>
  )
})
