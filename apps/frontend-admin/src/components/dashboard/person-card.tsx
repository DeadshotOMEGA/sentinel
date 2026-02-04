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

// Position color mapping for duty watch roles (faded style — purple)
const POSITION_COLORS: Record<string, string> = {
  SWK: 'border border-purple-500 bg-purple-500/10 text-purple-500 dark:border-purple-400 dark:bg-purple-400/20 dark:text-purple-400',
  DSWK: 'border border-purple-500 bg-purple-500/10 text-purple-500 dark:border-purple-400 dark:bg-purple-400/20 dark:text-purple-400',
  QM: 'border border-purple-500 bg-purple-500/10 text-purple-500 dark:border-purple-400 dark:bg-purple-400/20 dark:text-purple-400',
  BM: 'border border-purple-500 bg-purple-500/10 text-purple-500 dark:border-purple-400 dark:bg-purple-400/20 dark:text-purple-400',
  APS: 'border border-purple-500 bg-purple-500/10 text-purple-500 dark:border-purple-400 dark:bg-purple-400/20 dark:text-purple-400',
}

// Map chipColor to avatar classes (faded style — border + 10% bg + colored text)
const CHIP_COLOR_AVATAR_CLASSES: Record<string, string> = {
  default: 'border border-zinc-500 bg-zinc-500/10 text-zinc-500 dark:border-zinc-400 dark:bg-zinc-400/20 dark:text-zinc-400',
  primary: 'border border-primary bg-primary/10 text-primary dark:border-primary dark:bg-primary/20 dark:text-primary',
  secondary: 'border border-secondary bg-secondary/10 text-secondary dark:border-secondary dark:bg-secondary/20 dark:text-secondary',
  success: 'border border-emerald-500 bg-emerald-500/10 text-emerald-500 dark:border-emerald-400 dark:bg-emerald-400/20 dark:text-emerald-400',
  warning: 'border border-amber-500 bg-amber-500/10 text-amber-500 dark:border-amber-400 dark:bg-amber-400/20 dark:text-amber-400',
  danger: 'border border-red-500 bg-red-500/10 text-red-500 dark:border-red-400 dark:bg-red-400/20 dark:text-red-400',
  blue: 'border border-blue-500 bg-blue-500/10 text-blue-500 dark:border-blue-400 dark:bg-blue-400/20 dark:text-blue-400',
  green: 'border border-green-500 bg-green-500/10 text-green-500 dark:border-green-400 dark:bg-green-400/20 dark:text-green-400',
  pink: 'border border-pink-500 bg-pink-500/10 text-pink-500 dark:border-pink-400 dark:bg-pink-400/20 dark:text-pink-400',
  purple: 'border border-purple-500 bg-purple-500/10 text-purple-500 dark:border-purple-400 dark:bg-purple-400/20 dark:text-purple-400',
  red: 'border border-red-500 bg-red-500/10 text-red-500 dark:border-red-400 dark:bg-red-400/20 dark:text-red-400',
  yellow: 'border border-yellow-500 bg-yellow-500/10 text-yellow-500 dark:border-yellow-400 dark:bg-yellow-400/20 dark:text-yellow-400',
  cyan: 'border border-cyan-500 bg-cyan-500/10 text-cyan-500 dark:border-cyan-400 dark:bg-cyan-400/20 dark:text-cyan-400',
  zinc: 'border border-zinc-500 bg-zinc-500/10 text-zinc-500 dark:border-zinc-400 dark:bg-zinc-400/20 dark:text-zinc-400',
}

// Tags that represent active responsibilities (shown only when person holds the role)
const RESPONSIBILITY_TAG_NAMES = ['DDS']

interface PersonAvatarProps {
  person: PresentPerson
  dutyPosition?: string | null
  isDds?: boolean
}

function PersonAvatar({ person, dutyPosition, isDds }: PersonAvatarProps) {
  // Priority 1: Duty position
  if (dutyPosition) {
    const colorClass = POSITION_COLORS[dutyPosition] || 'border border-purple-500 bg-purple-500/10 text-purple-500 dark:border-purple-400 dark:bg-purple-400/20 dark:text-purple-400'
    return (
      <div className="avatar avatar-placeholder" aria-label={`On duty as ${dutyPosition}`}>
        <div className={`w-10 rounded-full ${colorClass}`}>
          <span className="text-xs font-bold">{dutyPosition}</span>
        </div>
      </div>
    )
  }

  // Priority 2: Active DDS
  if (isDds) {
    const ddsTag = person.tags?.find((t) => t.name === 'DDS')
    const colorClass = ddsTag?.chipColor
      ? CHIP_COLOR_AVATAR_CLASSES[ddsTag.chipColor] || CHIP_COLOR_AVATAR_CLASSES.default
      : 'border border-red-500 bg-red-500/10 text-red-500 dark:border-red-400 dark:bg-red-400/20 dark:text-red-400'
    return (
      <div className="avatar avatar-placeholder" aria-label="Duty Day Staff">
        <div className={`w-10 rounded-full ${colorClass}`}>
          <span className="text-xs font-bold">DDS</span>
        </div>
      </div>
    )
  }

  // Priority 3: First non-responsibility, non-positional tag (for members)
  if (person.type === 'member') {
    const displayTag = person.tags?.find((t) => !RESPONSIBILITY_TAG_NAMES.includes(t.name) && !t.isPositional)
    if (displayTag) {
      const abbrev = displayTag.name.match(/[A-Z]/g)?.join('') || displayTag.name.slice(0, 2).toUpperCase()
      const colorClass = displayTag.chipColor
        ? CHIP_COLOR_AVATAR_CLASSES[displayTag.chipColor] || CHIP_COLOR_AVATAR_CLASSES.default
        : CHIP_COLOR_AVATAR_CLASSES.default
      return (
        <div className="avatar avatar-placeholder" aria-label={`Tagged as ${displayTag.name}`}>
          <div className={`w-10 rounded-full ${colorClass}`}>
            <span className="text-xs font-bold">{abbrev}</span>
          </div>
        </div>
      )
    }
  }

  // Priority 4: Default initials
  const initials = person.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return (
    <div className="avatar avatar-placeholder" aria-label={person.name}>
      <div className="w-10 rounded-full border border-zinc-400 bg-zinc-400/10 text-zinc-500 dark:border-zinc-500 dark:bg-zinc-500/20 dark:text-zinc-400">
        <span className="text-xs font-bold">{initials}</span>
      </div>
    </div>
  )
}

interface PersonCardProps {
  person: PresentPerson
  dutyPosition?: string | null
  isDds?: boolean
  onCheckoutVisitor?: (id: string) => void
}

export const PersonCard = memo(function PersonCard({
  person,
  dutyPosition,
  isDds,
  onCheckoutVisitor,
}: PersonCardProps) {
  const isMember = person.type === 'member'

  // Determine which tag the avatar is displaying (if any) to avoid showing it as a chip too
  const avatarTagId =
    isMember && !dutyPosition && !isDds
      ? person.tags?.find((t) => !RESPONSIBILITY_TAG_NAMES.includes(t.name) && !t.isPositional)?.id
      : undefined

  // Card border color: subtle indicator for member vs visitor
  const cardBorderClass = isMember
    ? 'border-success/30 hover:border-success/50'
    : 'border-info/30 hover:border-info/50'

  return (
    <div className={`card card-elevated rounded-xl border ${cardBorderClass}`}>
      <div className="card-body p-3 gap-2">
        {/* Header - different layout for member vs visitor */}
        {isMember ? (
          <div className="flex items-center gap-2">
            <PersonAvatar person={person} dutyPosition={dutyPosition} isDds={isDds} />
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
        <div className="min-h-[1.25rem]">
          {isMember ? (
            <div className="flex flex-wrap gap-1">
              {person.tags
                ?.filter((tag) => tag.source !== 'qualification' && tag.id !== avatarTagId)
                .map((tag) => (
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
