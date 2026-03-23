'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, DoorOpen, ShieldCheck, UserCheck } from 'lucide-react'
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

interface KioskResponsibilityPromptProps {
  state: KioskResponsibilityStateResponse
  isPending: boolean
  errorMessage?: string | null
  onDecline: () => void
  onSubmit: (selection: { openBuilding: boolean; takeDds: boolean }) => void
}

function formatMemberName(member: { rank: string; firstName: string; lastName: string } | null) {
  if (!member) return null
  return `${member.rank} ${member.firstName} ${member.lastName}`
}

export function KioskResponsibilityPrompt({
  state,
  isPending,
  errorMessage,
  onDecline,
  onSubmit,
}: KioskResponsibilityPromptProps) {
  const [openBuilding, setOpenBuilding] = useState(state.needsBuildingOpen)
  const [takeDds, setTakeDds] = useState(false)

  useEffect(() => {
    setOpenBuilding(state.needsBuildingOpen)
    setTakeDds(false)
  }, [state.member.id, state.needsBuildingOpen])

  useEffect(() => {
    if (takeDds) {
      setOpenBuilding(true)
    }
  }, [takeDds])

  const submitDisabled =
    isPending ||
    (!takeDds && !openBuilding) ||
    (takeDds && !state.canAcceptDds) ||
    (!takeDds && openBuilding && !state.canOpenBuilding)

  const headline = state.isFirstMemberCheckin
    ? 'You are the first member checked in today.'
    : 'Daily opening responsibilities are still unresolved.'

  const scheduledDdsName = formatMemberName(state.scheduledDds)
  const currentDdsName = formatMemberName(state.currentDds)
  const currentHolderName = formatMemberName(state.currentLockupHolder)

  return (
    <div
      className="absolute inset-0 z-[var(--z-modal)] bg-base-100/98"
      data-testid={TID.dashboard.kiosk.responsibilityPrompt}
    >
      <div
        className="flex h-full items-center justify-center"
        style={{ padding: 'var(--space-6)' }}
      >
        <AppCard
          variant="elevated"
          status="warning"
          className="w-full max-w-4xl border border-warning/30 bg-warning-fadded/30"
        >
          <AppCardHeader
            className="border-b border-base-300"
            style={{ padding: 'var(--space-6)', gap: 'var(--space-3)' }}
          >
            <div className="flex flex-wrap items-center gap-2">
              <AppBadge status="warning">ACTION REQUIRED</AppBadge>
              {state.isFirstMemberCheckin && <AppBadge status="info">FIRST MEMBER</AppBadge>}
              {state.needsBuildingOpen && <AppBadge status="error">BUILDING SECURED</AppBadge>}
              {state.needsDds && <AppBadge status="warning">DDS NEEDED</AppBadge>}
            </div>
            <AppCardTitle className="font-display text-3xl sm:text-4xl">{headline}</AppCardTitle>
            <AppCardDescription className="max-w-3xl text-base text-base-content/80">
              Confirm whether you are opening the building and whether you are taking Duty Day Staff
              responsibility for today.
            </AppCardDescription>
          </AppCardHeader>

          <AppCardContent
            className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]"
            style={{ padding: 'var(--space-6)' }}
          >
            <div className="space-y-5">
              <div role="alert" className="alert alert-warning alert-soft">
                <AlertTriangle className="h-5 w-5" />
                <div>
                  <p className="font-semibold">Responsibility confirmation required</p>
                  <p className="text-sm">
                    The kiosk will continue asking later arrivals until the building is open and a
                    DDS is active for today.
                  </p>
                </div>
              </div>

              <fieldset className="fieldset rounded-box border border-base-300 bg-base-100/90">
                <legend className="fieldset-legend px-3">Opening responsibility</legend>
                <label
                  className={`flex items-center justify-between gap-4 px-4 py-4 ${
                    !state.canOpenBuilding ? 'opacity-60' : ''
                  }`}
                >
                  <div>
                    <p className="font-semibold">I am opening the building</p>
                    <p className="text-sm text-base-content/70">
                      Opening the building makes you the current lockup holder until DDS is active.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="toggle toggle-lg toggle-success"
                    checked={openBuilding}
                    disabled={!state.canOpenBuilding || takeDds}
                    onChange={(event) => setOpenBuilding(event.target.checked)}
                  />
                </label>
                {!state.canOpenBuilding && (
                  <p className="label px-4 pb-4 text-warning-fadded-content">
                    You must be checked in and lockup-qualified to open the building.
                  </p>
                )}
              </fieldset>

              <fieldset className="fieldset rounded-box border border-base-300 bg-base-100/90">
                <legend className="fieldset-legend px-3">DDS responsibility</legend>
                <label
                  className={`flex items-center justify-between gap-4 px-4 py-4 ${
                    !state.canAcceptDds ? 'opacity-60' : ''
                  }`}
                >
                  <div>
                    <p className="font-semibold">I am taking DDS for today</p>
                    <p className="text-sm text-base-content/70">
                      Taking DDS also opens the building and transfers lockup to you automatically.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="toggle toggle-lg toggle-primary"
                    checked={takeDds}
                    disabled={!state.canAcceptDds}
                    onChange={(event) => setTakeDds(event.target.checked)}
                  />
                </label>
                {!state.canAcceptDds && (
                  <p className="label px-4 pb-4 text-warning-fadded-content">
                    You must be checked in and hold an active DDS qualification to take DDS.
                  </p>
                )}
              </fieldset>

              {errorMessage && (
                <div role="alert" className="alert alert-error alert-soft">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  className="btn btn-lg btn-ghost"
                  onClick={onDecline}
                  disabled={isPending}
                  data-testid={TID.dashboard.kiosk.responsibilityDecline}
                >
                  Not Me
                </button>
                <button
                  type="button"
                  className="btn btn-lg btn-primary"
                  disabled={submitDisabled}
                  onClick={() => onSubmit({ openBuilding, takeDds })}
                  data-testid={TID.dashboard.kiosk.responsibilitySubmit}
                >
                  {isPending && <ButtonSpinner />}
                  Accept Responsibility
                </button>
              </div>
            </div>

            <div className="rounded-box border border-base-300 bg-base-100/90">
              <div
                className="grid divide-y divide-base-300"
                style={{ gap: '0', padding: 'var(--space-2)' }}
              >
                <div className="flex items-start gap-3 px-3 py-4">
                  <UserCheck className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs uppercase tracking-wide text-base-content/60">
                      Scanned Member
                    </p>
                    <p className="font-semibold">{formatMemberName(state.member)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 px-3 py-4">
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-warning" />
                  <div>
                    <p className="text-xs uppercase tracking-wide text-base-content/60">Live DDS</p>
                    <p className="font-semibold">{currentDdsName ?? 'No active DDS yet'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 px-3 py-4">
                  <DoorOpen className="mt-0.5 h-5 w-5 text-success" />
                  <div>
                    <p className="text-xs uppercase tracking-wide text-base-content/60">
                      Building Status
                    </p>
                    <p className="font-semibold capitalize">{state.buildingStatus}</p>
                    <p className="text-sm text-base-content/70">
                      Lockup holder: {currentHolderName ?? 'None assigned'}
                    </p>
                  </div>
                </div>
                <div className="px-3 py-4">
                  <p className="text-xs uppercase tracking-wide text-base-content/60">
                    Scheduled DDS
                  </p>
                  <p className="font-semibold">{scheduledDdsName ?? 'No scheduled DDS found'}</p>
                </div>
              </div>
            </div>
          </AppCardContent>
        </AppCard>
      </div>
    </div>
  )
}
