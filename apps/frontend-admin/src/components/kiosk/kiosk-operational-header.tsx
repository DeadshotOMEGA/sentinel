'use client'

import { AlertTriangle, Clock3, DoorOpen } from 'lucide-react'
import { AppBadge } from '@/components/ui/AppBadge'
import {
  AppCard,
  AppCardContent,
  AppCardDescription,
  AppCardHeader,
  AppCardTitle,
} from '@/components/ui/AppCard'
import { Chip } from '@/components/ui/chip'
import type {
  KioskConnectivityBadge,
  KioskHealthIndicator,
  OperationalLead,
  ReadinessWarning,
} from './kiosk-domain'

interface KioskOperationalHeaderProps {
  fatalOperationalOutage: boolean
  connectivityBadge: KioskConnectivityBadge
  clockLabel: string
  healthIndicator: KioskHealthIndicator
  leadDisplay: OperationalLead | null
  leadDisplayName: string | null
  leadDisplayLoading: boolean
  loadingOperationalData: boolean
  degradedOperationalData: boolean
  readinessWarnings: ReadinessWarning[]
}

function SkeletonStrip({ title }: { title: string }) {
  return (
    <div className="rounded-box border border-base-300 bg-base-200/60 px-(--space-4) py-(--space-3)">
      <p className="text-xs uppercase tracking-[0.18em] text-base-content/45">{title}</p>
      <div className="mt-(--space-2) h-4 w-28 animate-pulse rounded-box bg-base-300" />
    </div>
  )
}

export function KioskOperationalHeader({
  fatalOperationalOutage,
  connectivityBadge,
  clockLabel,
  healthIndicator,
  leadDisplay,
  leadDisplayName,
  leadDisplayLoading,
  loadingOperationalData,
  degradedOperationalData,
  readinessWarnings,
}: KioskOperationalHeaderProps) {
  return (
    <header>
      <AppCard
        variant="elevated"
        status={fatalOperationalOutage ? 'error' : undefined}
        className="border border-base-300 bg-base-100/95 shadow-[var(--shadow-2)] backdrop-blur-sm"
      >
        <AppCardHeader className="gap-(--space-3)" style={{ padding: 'var(--space-5)' }}>
          <div className="flex flex-col gap-(--space-3) xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-4xl">
              <div className="flex flex-wrap items-center gap-(--space-2)">
                <Chip
                  variant="faded"
                  color="primary"
                  size="sm"
                  className="uppercase tracking-[0.16em]"
                >
                  Front Entrance
                </Chip>
                <AppBadge
                  status={connectivityBadge.status}
                  className="badge-outline backend-status-badge"
                  title={connectivityBadge.detail}
                >
                  <span
                    className={[
                      'status',
                      connectivityBadge.status === 'success' && 'status-success',
                      connectivityBadge.status === 'warning' && 'status-warning',
                      connectivityBadge.status === 'error' && 'status-error',
                      connectivityBadge.status === 'info' && 'status-info',
                      connectivityBadge.status === 'neutral' && 'status-neutral',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  />
                  <span>{connectivityBadge.label}</span>
                </AppBadge>
              </div>
              <AppCardTitle className="mt-(--space-3) font-display text-3xl leading-tight text-base-content xl:text-4xl">
                Front Entrance Kiosk
              </AppCardTitle>
              <AppCardDescription className="mt-(--space-2) max-w-3xl text-base leading-relaxed text-base-content/72">
                Members use the external badge reader. Visitors check themselves in on this screen.
              </AppCardDescription>
            </div>

            <div className="grid gap-(--space-3) sm:grid-cols-2 xl:w-[36rem]">
              <div className="rounded-box border border-base-300 bg-base-200/70 px-(--space-4) py-(--space-3)">
                <div className="flex items-center gap-(--space-2)">
                  <Clock3 className="h-4 w-4 text-base-content/55" />
                  <p className="text-xs uppercase tracking-[0.18em] text-base-content/50">
                    Local time
                  </p>
                </div>
                <p
                  suppressHydrationWarning
                  className="mt-(--space-2) font-mono text-sm leading-relaxed text-base-content/80"
                >
                  {clockLabel}
                </p>
                <div className="mt-(--space-3) flex items-center gap-(--space-2)">
                  <span
                    aria-hidden="true"
                    className={[
                      'status status-sm',
                      healthIndicator.tone === 'success' && 'status-success',
                      healthIndicator.tone === 'warning' && 'status-warning',
                      healthIndicator.tone === 'error' && 'status-error',
                      healthIndicator.tone === 'info' && 'status-info',
                      healthIndicator.pulse && 'animate-status-pulse',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  />
                  <p className="text-[0.7rem] font-medium uppercase tracking-[0.18em] text-base-content/50">
                    Readiness {healthIndicator.label}
                  </p>
                </div>
              </div>
              <div className="rounded-box border border-base-300 bg-base-200/70 px-(--space-4) py-(--space-3)">
                <p className="text-xs uppercase tracking-[0.18em] text-base-content/50">
                  Today&apos;s lead
                </p>
                {leadDisplayLoading ? (
                  <div className="mt-(--space-2) h-4 w-28 animate-pulse rounded-box bg-base-300" />
                ) : (
                  <>
                    <p className="mt-(--space-2) text-sm font-semibold leading-tight text-base-content">
                      {leadDisplay?.roleLabel ?? 'No live lead yet'}
                    </p>
                    <p className="mt-(--space-1) text-sm leading-relaxed text-base-content/78">
                      {leadDisplayName ?? 'Waiting for the day’s assignment or watch lead.'}
                    </p>
                    {leadDisplay && (
                      <p className="mt-(--space-1) text-xs uppercase tracking-[0.16em] text-base-content/48">
                        {leadDisplay.roleDescription}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </AppCardHeader>

        {(loadingOperationalData ||
          fatalOperationalOutage ||
          degradedOperationalData ||
          readinessWarnings.length > 0) && (
          <AppCardContent
            className="grid gap-(--space-3)"
            style={{ padding: '0 var(--space-5) var(--space-5)' }}
          >
            {fatalOperationalOutage ? (
              <div role="alert" className="alert alert-error alert-soft">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <div>
                  <p className="font-semibold">Kiosk services are unavailable.</p>
                  <p className="text-sm">
                    Member scans and visitor sign-in are paused until the kiosk reconnects.
                  </p>
                </div>
              </div>
            ) : degradedOperationalData ? (
              <div role="alert" className="alert alert-warning alert-soft">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <div>
                  <p className="font-semibold">Status data is delayed.</p>
                  <p className="text-sm">
                    The kiosk can still be used, but readiness indicators may lag behind live
                    changes.
                  </p>
                </div>
              </div>
            ) : null}

            {loadingOperationalData ? (
              <div className="grid gap-(--space-3) xl:grid-cols-2">
                <SkeletonStrip title="Checking unit status" />
                <SkeletonStrip title="Checking DDS status" />
              </div>
            ) : readinessWarnings.length > 0 ? (
              <div className="grid gap-(--space-3) xl:grid-cols-2">
                {readinessWarnings.map((warning) => {
                  const Icon = warning.key === 'unit-secured' ? DoorOpen : AlertTriangle

                  return (
                    <div
                      key={warning.key}
                      className="rounded-box border border-warning/45 bg-warning/18 p-(--space-3) text-base-content shadow-[var(--shadow-1)]"
                    >
                      <div className="flex items-start gap-(--space-3)">
                        <div className="rounded-box border border-warning/40 bg-warning/22 p-(--space-2) text-warning-content">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold leading-tight">{warning.label}</p>
                          <p className="mt-(--space-1) text-sm leading-relaxed text-base-content/78">
                            {warning.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : null}
          </AppCardContent>
        )}
      </AppCard>
    </header>
  )
}
