'use client'

import { memo } from 'react'
import { Clock, User, Building2, LogOut } from 'lucide-react'
import { AppBadge } from '@/components/ui/AppBadge'
import {
  Chip,
  fadedColorClasses,
  normalizeChipColor,
  type ChipColor,
  type ChipVariant,
} from '@/components/ui/chip'
import type { PresentPerson } from '@sentinel/contracts'
import { TID } from '@/lib/test-ids'
import { formatPersonLabel } from '@/lib/name-format'

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
const HOVER_3D_LAYER_KEYS = Array.from({ length: 8 }, (_, index) => index)

interface PersonAvatarProps {
  person: PresentPerson
  dutyPosition?: string | null
  isDds?: boolean
}

function getOptionalDisplayName(person: PresentPerson): string | undefined {
  const value = (person as { displayName?: unknown }).displayName
  return typeof value === 'string' && value.trim() ? value : undefined
}

function getOptionalString(person: PresentPerson, key: string): string | undefined {
  const value = (person as Record<string, unknown>)[key]
  return typeof value === 'string' && value.trim() ? value : undefined
}

function getAvatarColorClass(chipColor?: string): string {
  if (!chipColor) {
    return CHIP_COLOR_AVATAR_CLASSES.default
  }

  const normalized = normalizeChipColor(chipColor as ChipColor)
  return CHIP_COLOR_AVATAR_CLASSES[normalized] || CHIP_COLOR_AVATAR_CLASSES.default
}

function getVisitorTypeName(person: PresentPerson): string | undefined {
  return person.visitType?.name?.trim().toLowerCase()
}

function getVisitorTitle(person: PresentPerson, displayName: string): string {
  const visitorType = getVisitorTypeName(person)
  const firstName = getOptionalString(person, 'firstName')
  const lastName = getOptionalString(person, 'lastName')

  if (visitorType !== 'military' && firstName && lastName) {
    return `${firstName} ${lastName}`
  }

  return displayName
}

function getVisitorSubtitle(person: PresentPerson): string | undefined {
  if (person.organization) {
    return person.organization
  }

  const visitReason = person.visitReason?.trim()
  if (!visitReason) return undefined

  const firstSegment = visitReason
    .split('|')
    .map((segment) => segment.trim())
    .find(Boolean)

  if (!firstSegment) return undefined

  const militaryMatch = firstSegment.match(/^Military visitor from\s+(.+)$/i)
  return militaryMatch?.[1]?.trim() || undefined
}

function getVisitorSummary(person: PresentPerson): string | undefined {
  const visitReason = person.visitReason?.trim()
  if (!visitReason) return undefined

  const segments = visitReason
    .split('|')
    .map((segment) => segment.trim())
    .filter(Boolean)

  if (segments.length === 0) return undefined

  const organization = person.organization?.trim()
  const firstSegment = segments[0]

  if (
    organization &&
    firstSegment.localeCompare(`Contractor visit for ${organization}`, undefined, {
      sensitivity: 'accent',
    }) === 0
  ) {
    segments.shift()
  } else if (/^Military visitor from\s+.+$/i.test(firstSegment)) {
    segments.shift()
  }

  if (segments[0]?.localeCompare('Other', undefined, { sensitivity: 'accent' }) === 0) {
    segments.shift()
  }

  if (segments.length === 0) return undefined

  return segments.join(' • ')
}

function PersonAvatar({ person, dutyPosition, isDds }: PersonAvatarProps) {
  // Priority 1: Active DDS
  if (isDds) {
    const ddsTag = person.tags?.find((t) => t.name === 'DDS')
    const colorClass = ddsTag?.chipColor
      ? getAvatarColorClass(ddsTag.chipColor)
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
    const colorClass = posTag?.chipColor ? getAvatarColorClass(posTag.chipColor) : POSITION_COLOR
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
        ? getAvatarColorClass(displayTag.chipColor)
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
  const initials = (getOptionalDisplayName(person) ?? person.name)
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return (
    <div
      className="avatar avatar-placeholder"
      aria-label={getOptionalDisplayName(person) ?? person.name}
    >
      <div className="w-10 rounded-full border border-base-400 bg-neutral-fadded text-base-content/60">
        <span className="text-xs font-bold">{initials}</span>
      </div>
    </div>
  )
}

interface PersonCardProps {
  person: PresentPerson
  dutyPosition?: string | null
  isDds?: boolean
  isSelected?: boolean
  onCheckoutVisitor?: (id: string) => void
  onSelectMember?: (person: PresentPerson, sideHint: 'left' | 'right') => void
}

export const PersonCard = memo(function PersonCard({
  person,
  dutyPosition,
  isDds,
  isSelected = false,
  onCheckoutVisitor,
  onSelectMember,
}: PersonCardProps) {
  const isMember = person.type === 'member'
  const isInteractive = Boolean(isMember && onSelectMember)
  const displayName = formatPersonLabel({
    name: person.name,
    displayName: getOptionalDisplayName(person),
    rank: person.rank,
    compact: !isMember,
  })
  const memberFirstName = getOptionalString(person, 'firstName')
  const memberLastName = getOptionalString(person, 'lastName')
  const memberInitials = getOptionalString(person, 'initials')
  const divisionCode = getOptionalString(person, 'divisionCode') ?? person.division

  const fallbackSplit = displayName.split(',')
  const memberTitle =
    person.rank && memberLastName
      ? `${person.rank} ${memberLastName}`
      : fallbackSplit[0]?.trim() || displayName
  const memberSubtitle = memberFirstName ?? memberInitials
  const memberFallbackSubtitle = fallbackSplit.slice(1).join(',').trim()
  const visitorTitle = getVisitorTitle(person, displayName)
  const visitorSubtitle = getVisitorSubtitle(person)
  const visitorSummary = getVisitorSummary(person)

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
  const cardBorderClass = isSelected
    ? 'border-primary shadow-md ring-1 ring-primary/20'
    : isMember
      ? 'border-primary/50'
      : 'border-neutral/50'
  const cardSurfaceClass = isMember ? 'card-elevated' : 'card-elevated-neutral'

  const handleMemberSelect = (sideHint: 'left' | 'right') => {
    if (isInteractive) {
      onSelectMember?.(person, sideHint)
    }
  }

  const cardContent = (
    <div
      className={`card border h-full min-w-0 ${cardSurfaceClass} ${cardBorderClass} ${
        isInteractive
          ? 'group-hover:border-primary group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-primary/40'
          : ''
      }`}
    >
      <div className="card-body min-w-0 p-3.5 gap-2.5">
        {/* Header - different layout for member vs visitor */}
        {isMember ? (
          <div className="flex items-start gap-2">
            <PersonAvatar person={person} dutyPosition={dutyPosition} isDds={isDds} />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-[0.95rem] leading-tight truncate">{memberTitle}</h3>
              {(memberSubtitle || memberFallbackSubtitle) && (
                <p className="text-xs text-base-content/60 truncate">
                  {memberSubtitle || memberFallbackSubtitle}
                </p>
              )}
            </div>
            {divisionCode && (
              <span className="badge badge-outline badge-sm shrink-0">{divisionCode}</span>
            )}
          </div>
        ) : (
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-[0.95rem] leading-tight truncate">{visitorTitle}</h3>
              {visitorSubtitle && (
                <p className="text-xs text-base-content/60 truncate">{visitorSubtitle}</p>
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
              {person.liveDutyAssignment && (
                <AppBadge status="warning" size="sm">
                  Temp {person.liveDutyAssignment.dutyPosition.code}
                </AppBadge>
              )}
              {!person.liveDutyAssignment && person.scheduledDutyTonight?.dutyPosition?.code && (
                <AppBadge
                  status={
                    person.scheduledDutyTonight.source === 'night_override' ? 'warning' : 'neutral'
                  }
                  size="sm"
                >
                  Tonight {person.scheduledDutyTonight.dutyPosition.code}
                </AppBadge>
              )}
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
            <div className="flex min-w-0 flex-col gap-1 text-xs text-base-content/70">
              {person.hostName && (
                <span className="flex min-w-0 items-start gap-1">
                  <User size={10} className="mt-0.5 shrink-0" />
                  <span className="truncate">
                    <span className="text-base-content/55">Host:</span> {person.hostName}
                  </span>
                </span>
              )}
              {visitorSummary && (
                <span className="flex min-w-0 items-start gap-1">
                  <Building2 size={10} className="mt-0.5 shrink-0" />
                  <span className="line-clamp-2 break-words">
                    <span className="text-base-content/55">Details:</span> {visitorSummary}
                  </span>
                </span>
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
          {isInteractive && (
            <span className="font-medium text-primary/80">
              {isSelected ? 'Actions open' : 'Open actions'}
            </span>
          )}
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

  return (
    <div
      className={`hover-3d presence-card-hover-3d group h-full w-full ${
        isInteractive ? 'cursor-pointer focus-visible:outline-none' : ''
      }`}
      data-testid={TID.dashboard.personCard(person.id)}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-expanded={isInteractive ? isSelected : undefined}
      aria-haspopup={isInteractive ? 'menu' : undefined}
      onClick={
        isInteractive
          ? (event) => {
              handleMemberSelect(event.clientX >= window.innerWidth / 2 ? 'left' : 'right')
            }
          : undefined
      }
      onKeyDown={
        isInteractive
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                const rect = event.currentTarget.getBoundingClientRect()
                const centerX = rect.left + rect.width / 2
                handleMemberSelect(centerX >= window.innerWidth / 2 ? 'left' : 'right')
              }
            }
          : undefined
      }
    >
      {cardContent}
      {HOVER_3D_LAYER_KEYS.map((key) => (
        <div key={key} aria-hidden="true" />
      ))}
    </div>
  )
})
