'use client'

import { memo } from 'react'
import { Clock, User, Building2, LogOut } from 'lucide-react'
import { Chip, fadedColorClasses, type ChipColor, type ChipVariant } from '@/components/ui/chip'
import type { PresentPerson } from '@sentinel/contracts'
import { TID } from '@/lib/test-ids'

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

// Position color mapping for duty watch roles (uses DaisyUI secondary)
const POSITION_COLOR = 'border border-secondary bg-secondary/10 text-secondary'

// Reuse faded color classes from Chip component for avatar styling
const CHIP_COLOR_AVATAR_CLASSES: Record<string, string> = fadedColorClasses

// Tag names that represent active responsibilities — hidden from avatar fallback and chips
// These are qualification tags (DDS, Duty Watch positions) that only display when scheduled
const RESPONSIBILITY_TAG_NAMES = ['DDS', 'SWK', 'DSWK', 'QM', 'BM', 'APS']
const FTS_TAG_NAME = 'FTS'

interface PersonAvatarProps {
  person: PresentPerson
  dutyPosition?: string | null
  isDds?: boolean
}

function PersonAvatar({ person, dutyPosition, isDds }: PersonAvatarProps) {
  // Priority 1: Active DDS
  if (isDds) {
    const ddsTag = person.tags?.find((t) => t.name === 'DDS')
    const colorClass = ddsTag?.chipColor
      ? CHIP_COLOR_AVATAR_CLASSES[ddsTag.chipColor] || CHIP_COLOR_AVATAR_CLASSES.default
      : 'border border-error bg-error/10 text-error'
    return (
      <div className="avatar avatar-placeholder" aria-label="Duty Day Staff">
        <div className={`w-10 rounded-full ${colorClass}`}>
          <span className="text-xs font-bold">DDS</span>
        </div>
      </div>
    )
  }

  // Priority 2: Duty Watch position (qualification tag, like DDS)
  if (dutyPosition) {
    const posTag = person.tags?.find((t) => t.name === dutyPosition)
    const colorClass = posTag?.chipColor
      ? CHIP_COLOR_AVATAR_CLASSES[posTag.chipColor] || CHIP_COLOR_AVATAR_CLASSES.default
      : POSITION_COLOR
    return (
      <div className="avatar avatar-placeholder" aria-label={`On duty as ${dutyPosition}`}>
        <div className={`w-10 rounded-full ${colorClass}`}>
          <span className="text-xs font-bold">{dutyPosition}</span>
        </div>
      </div>
    )
  }

  // Priority 3+: Tag-based avatar (FTS first, then by displayOrder)
  if (person.type === 'member') {
    const nonPositionalTags = person.tags?.filter(
      (t) => !RESPONSIBILITY_TAG_NAMES.includes(t.name) && !t.isPositional
    )

    // Priority 3: FTS tag
    const ftsTag = nonPositionalTags?.find((t) => t.name === FTS_TAG_NAME)
    // Priority 4: Other non-positional tags sorted by displayOrder (already sorted from backend)
    const displayTag = ftsTag ?? nonPositionalTags?.[0]

    if (displayTag) {
      const abbrev =
        displayTag.name.match(/[A-Z]/g)?.join('') || displayTag.name.slice(0, 2).toUpperCase()
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

  // Priority 5: Default initials
  const initials = (person.displayName ?? person.name)
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return (
    <div className="avatar avatar-placeholder" aria-label={person.displayName ?? person.name}>
      <div className="w-10 rounded-full border border-base-300 bg-base-200 text-base-content/60">
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
  const displayName = person.displayName ?? person.name

  // Determine which tag the avatar is displaying (if any) to suppress from chip row
  const avatarTagId = (() => {
    if (!isMember || isDds || dutyPosition) return undefined
    const nonPositionalTags = person.tags?.filter(
      (t) => !RESPONSIBILITY_TAG_NAMES.includes(t.name) && !t.isPositional
    )
    const ftsTag = nonPositionalTags?.find((t) => t.name === FTS_TAG_NAME)
    return (ftsTag ?? nonPositionalTags?.[0])?.id
  })()

  // Card border color: subtle indicator for member vs visitor
  const cardBorderClass = isMember ? 'border-primary/50' : 'border-neutral/50'

  return (
    <div
      className={`card card-elevated border-2 h-full ${cardBorderClass}`}
      data-testid={TID.dashboard.personCard(person.id)}
    >
      <div className="card-body p-3 gap-2">
        {/* Header - different layout for member vs visitor */}
        {isMember ? (
          <div className="flex items-center gap-2">
            <PersonAvatar person={person} dutyPosition={dutyPosition} isDds={isDds} />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm truncate">{displayName}</h3>
              {displayName !== person.name && (
                <p className="text-xs text-base-content/60 truncate">{person.name}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm truncate">{displayName}</h3>
              {person.organization && (
                <p className="text-xs text-base-content/60 truncate">{person.organization}</p>
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
        <div className="min-h-5">
          {isMember ? (
            <div className="flex flex-wrap gap-1">
              {person.tags
                ?.filter((tag) => {
                  if (tag.source === 'qualification') return false
                  if (RESPONSIBILITY_TAG_NAMES.includes(tag.name)) return false
                  if (tag.id === avatarTagId) return false
                  return true
                })
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
              data-testid={TID.dashboard.visitorCheckout(person.id)}
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
