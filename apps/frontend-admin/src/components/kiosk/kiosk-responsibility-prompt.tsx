'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Clock3, DoorOpen, ShieldCheck, UserCheck, Users } from 'lucide-react'
import {
  AppCard,
  AppCardContent,
  AppCardDescription,
  AppCardHeader,
  AppCardTitle,
} from '@/components/ui/AppCard'
import { AppBadge } from '@/components/ui/AppBadge'
import { ButtonSpinner } from '@/components/ui/loading-spinner'
import { TID } from '@/lib/test-ids'
import type { KioskResponsibilityStateResponse } from '@sentinel/contracts'
import {
  getKioskResponsibilityPromptPresentation,
  getResponsibilityPrimaryLabel,
  getResponsibilitySummary,
  type ResponsibilityActionChoice,
} from './kiosk-responsibility-prompt.logic'

interface KioskResponsibilityPromptProps {
  state: KioskResponsibilityStateResponse
  isPending: boolean
  errorMessage?: string | null
  onDecline: () => void
  onSubmit: (action: ResponsibilityActionChoice) => void
}

const bannerToneClasses = {
  info: 'alert-info border border-info/30 bg-info-fadded text-info-fadded-content',
  warning: 'alert-warning border border-warning/30 bg-warning-fadded text-warning-fadded-content',
} as const

function formatMemberName(
  member:
    | {
        rank: string
        firstName: string
        lastName: string
      }
    | null
    | undefined
): string {
  if (!member) {
    return 'Unknown'
  }

  return `${member.rank} ${member.firstName} ${member.lastName}`
}

function formatTime(timestamp: string | null | undefined): string {
  if (!timestamp) {
    return 'Unknown time'
  }

  return new Date(timestamp).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatExpectedSource(state: KioskResponsibilityStateResponse): string {
  if (!state.expectedDds) {
    return 'No expected DDS set'
  }

  return state.expectedDds.source === 'live' ? 'Live DDS target' : 'Scheduled DDS target'
}

export function KioskResponsibilityPrompt({
  state,
  isPending,
  errorMessage,
  onDecline,
  onSubmit,
}: KioskResponsibilityPromptProps) {
  const presentation = useMemo(() => getKioskResponsibilityPromptPresentation(state), [state])
  const [selectedAction, setSelectedAction] = useState<ResponsibilityActionChoice | null>(
    presentation.defaultAction
  )

  useEffect(() => {
    setSelectedAction(presentation.defaultAction)
  }, [presentation.defaultAction, state.member.id, state.promptVariant])

  const selectedOption =
    presentation.actionOptions.find((option) => option.value === selectedAction) ?? null
  const primaryLabel = selectedOption
    ? getResponsibilityPrimaryLabel(state, selectedOption.value)
    : null
  const summaryText = selectedOption
    ? getResponsibilitySummary(state, selectedOption.value)
    : (presentation.blockedMessage ??
      'Arrival was recorded. Another member still needs to resolve responsibility.')
  const cardStatus = state.promptVariant === 'expected_dds' ? 'info' : 'warning'
  const openContext = state.currentOpenContext

  return (
    <div
      className="absolute inset-0 z-(--z-modal) bg-base-300/80 backdrop-blur-[2px]"
      data-testid={TID.dashboard.kiosk.responsibilityPrompt}
    >
      <div className="flex h-full items-center justify-center p-(--space-4)">
        <AppCard
          variant="elevated"
          status={cardStatus}
          className="w-full max-w-6xl border border-base-300 bg-base-100 text-base-content shadow-2xl"
        >
          <AppCardHeader
            className="border-b border-base-300 bg-base-200/85"
            style={{ padding: 'var(--space-5)', gap: 'var(--space-3)' }}
          >
            <div className="flex flex-wrap items-center gap-2">
              <AppBadge status="warning" size="lg">
                ACTION REQUIRED
              </AppBadge>
              {state.isFirstMemberCheckin && (
                <AppBadge status="info" size="lg">
                  FIRST ARRIVAL
                </AppBadge>
              )}
              {state.promptVariant === 'expected_dds' && (
                <AppBadge status="info" size="lg">
                  EXPECTED DDS
                </AppBadge>
              )}
              {state.needsBuildingOpen ? (
                <AppBadge status="warning" size="lg">
                  BUILDING SECURED
                </AppBadge>
              ) : (
                <AppBadge status="success" size="lg">
                  BUILDING OPEN
                </AppBadge>
              )}
              {state.needsDds && (
                <AppBadge status="warning" size="lg">
                  DDS NEEDED
                </AppBadge>
              )}
            </div>

            <AppCardTitle className="font-display text-4xl leading-tight sm:text-5xl">
              {presentation.headline}
            </AppCardTitle>
            <AppCardDescription className="max-w-4xl text-base text-base-content/80">
              {presentation.helperText}
            </AppCardDescription>
          </AppCardHeader>

          <AppCardContent
            className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]"
            style={{ padding: 'var(--space-5)' }}
          >
            <div className="space-y-4">
              <div
                role="alert"
                className={`alert alert-soft ${bannerToneClasses[presentation.bannerTone]}`}
              >
                <ShieldCheck className="h-5 w-5" />
                <div>
                  <p className="font-semibold">{presentation.bannerTitle}</p>
                  <p className="text-sm opacity-90">{presentation.bannerDescription}</p>
                </div>
              </div>

              {presentation.blockedMessage && (
                <div
                  role="alert"
                  className="alert alert-soft alert-warning border border-warning/30"
                >
                  <AlertTriangle className="h-4 w-4" />
                  <span>{presentation.blockedMessage}</span>
                </div>
              )}

              {presentation.actionOptions.length > 1 && (
                <fieldset className="fieldset rounded-box border border-base-300 bg-base-200/45 p-4">
                  <legend className="fieldset-legend px-1">Choose what you are doing now</legend>
                  <div className="space-y-3">
                    {presentation.actionOptions.map((option) => (
                      <label
                        key={option.value}
                        className={`flex cursor-pointer items-start gap-4 rounded-box border px-4 py-4 transition-colors ${
                          selectedAction === option.value
                            ? 'border-primary bg-primary-fadded text-primary-fadded-content'
                            : 'border-base-300 bg-base-100 text-base-content'
                        }`}
                      >
                        <input
                          type="radio"
                          name="kiosk-responsibility-action"
                          className="radio radio-primary radio-lg mt-1"
                          checked={selectedAction === option.value}
                          onChange={() => setSelectedAction(option.value)}
                        />
                        <div className="min-w-0">
                          <p className="text-lg font-semibold">{option.title}</p>
                          <p className="text-sm opacity-80">{option.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}

              {presentation.actionOptions.length === 1 && selectedOption && (
                <div className="rounded-box border border-base-300 bg-base-200/45 p-4">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-base-content/60">
                    Action Ready
                  </p>
                  <p className="mt-2 text-lg font-semibold">{selectedOption.title}</p>
                  <p className="mt-1 text-sm text-base-content/70">{selectedOption.description}</p>
                </div>
              )}

              {errorMessage && (
                <div role="alert" className="alert alert-error alert-soft">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="rounded-box border border-base-300 bg-base-200/45 p-4">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-base-content/60">
                  Current Selection
                </p>
                <p className="mt-2 text-lg font-semibold">{summaryText}</p>
              </div>

              <div className="flex flex-wrap justify-end gap-3 border-t border-base-300 pt-4">
                <button
                  type="button"
                  className="btn btn-lg btn-ghost min-w-40"
                  onClick={onDecline}
                  disabled={isPending}
                  data-testid={TID.dashboard.kiosk.responsibilityDecline}
                >
                  Not Me
                </button>
                {selectedOption && primaryLabel && (
                  <button
                    type="button"
                    className="btn btn-lg btn-primary min-w-64"
                    disabled={isPending}
                    onClick={() => onSubmit(selectedOption.value)}
                    data-testid={TID.dashboard.kiosk.responsibilitySubmit}
                  >
                    {isPending && <ButtonSpinner />}
                    {primaryLabel}
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-box border border-base-300 bg-base-200/35 p-4">
                <div className="stats stats-vertical w-full bg-transparent shadow-none">
                  <div className="stat px-0 py-3">
                    <div className="stat-figure text-primary">
                      <UserCheck className="h-5 w-5" />
                    </div>
                    <div className="stat-title">Scanned Member</div>
                    <div className="stat-value text-xl">{formatMemberName(state.member)}</div>
                    <div className="stat-desc">This arrival is already recorded.</div>
                  </div>

                  <div className="stat border-t border-base-300 px-0 py-3">
                    <div className="stat-figure text-info">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div className="stat-title">Expected DDS</div>
                    <div className="stat-value text-xl">
                      {state.expectedDds ? formatMemberName(state.expectedDds.member) : 'Not set'}
                    </div>
                    <div className="stat-desc">{formatExpectedSource(state)}</div>
                  </div>

                  <div className="stat border-t border-base-300 px-0 py-3">
                    <div className="stat-figure text-success">
                      <DoorOpen className="h-5 w-5" />
                    </div>
                    <div className="stat-title">Building Status</div>
                    <div className="stat-value text-xl capitalize">{state.buildingStatus}</div>
                    <div className="stat-desc">
                      {state.currentLockupHolder
                        ? `Lockup: ${formatMemberName(state.currentLockupHolder)}`
                        : 'No lockup holder assigned'}
                    </div>
                  </div>
                </div>
              </div>

              {openContext && (
                <div className="rounded-box border border-success/30 bg-success-fadded p-4 text-success-fadded-content">
                  <div className="flex items-start gap-3">
                    <Clock3 className="mt-1 h-5 w-5 shrink-0" />
                    <div>
                      <p className="font-semibold">Current Open Details</p>
                      <p className="text-sm opacity-90">
                        Opened by {formatMemberName(openContext.openedBy)} at{' '}
                        {formatTime(openContext.openedAt)}.
                      </p>
                      <p className="text-sm opacity-90">
                        Lockup is currently with {formatMemberName(openContext.currentLockupHolder)}
                        {openContext.currentHolderAcquiredAt
                          ? ` since ${formatTime(openContext.currentHolderAcquiredAt)}`
                          : '.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-box border border-base-300 bg-base-200/35 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-base-content/60">
                      Already In The Unit
                    </p>
                    <p className="mt-1 text-sm text-base-content/70">
                      {state.presentVisitorCount > 0
                        ? `${state.presentVisitorCount} visitor${state.presentVisitorCount === 1 ? '' : 's'} also signed in.`
                        : 'Members only are listed here.'}
                    </p>
                  </div>
                  <Users className="h-5 w-5 text-base-content/50" />
                </div>

                <ul className="list mt-3 max-h-56 overflow-y-auto pr-1">
                  {state.presentMembers.map((presentMember, index) => (
                    <li key={presentMember.id} className="list-row items-center px-0 py-2">
                      <span className="badge badge-ghost badge-sm">{index + 1}</span>
                      <div className="list-col-grow">
                        <p className="font-medium">{formatMemberName(presentMember)}</p>
                        <p className="text-xs text-base-content/60">
                          In at {formatTime(presentMember.checkedInAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-box border border-base-300 bg-neutral-fadded p-4 text-neutral-fadded-content">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] opacity-70">
                  Today&apos;s Open / Close Timeline
                </p>

                {state.todayCycles.length === 0 ? (
                  <p className="mt-3 text-sm opacity-80">
                    No open or lockup events have been recorded yet today.
                  </p>
                ) : (
                  <div className="mt-3 max-h-72 overflow-y-auto pr-1">
                    <ul className="timeline timeline-vertical timeline-compact">
                      {state.todayCycles.map((cycle, index) => (
                        <li key={cycle.id}>
                          {index > 0 && <hr className="bg-base-400" />}
                          <div className="timeline-middle">
                            <div
                              className={`h-3 w-3 rounded-full ${
                                cycle.isCurrent ? 'bg-success' : 'bg-neutral'
                              }`}
                            />
                          </div>
                          <div className="timeline-end timeline-box ml-3 w-full max-w-none border border-base-300 bg-base-100 px-3 py-3 text-base-content">
                            <p className="font-semibold">
                              {cycle.isCurrent ? 'Current open cycle' : 'Previous open cycle'}
                            </p>
                            <p className="mt-1 text-sm text-base-content/75">
                              Opened by {formatMemberName(cycle.openedBy)} at{' '}
                              {formatTime(cycle.openedAt)}.
                            </p>
                            <p className="text-sm text-base-content/75">
                              {cycle.closedAt
                                ? `Locked up by ${formatMemberName(cycle.closedBy)} at ${formatTime(cycle.closedAt)}.`
                                : cycle.isCurrent
                                  ? 'Still open now.'
                                  : 'Close details unavailable.'}
                            </p>
                          </div>
                          {index < state.todayCycles.length - 1 && <hr className="bg-base-400" />}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </AppCardContent>
        </AppCard>
      </div>
    </div>
  )
}
