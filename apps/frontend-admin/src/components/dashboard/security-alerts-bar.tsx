'use client'

import { useState } from 'react'
import { AlertCircle, BookOpen, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { useSecurityAlerts, useAcknowledgeAlert } from '@/hooks/use-security-alerts'
import { useAuthStore } from '@/store/auth-store'
import { AccountLevel } from '@/store/auth-store'
import { AppAlert } from '@/components/ui/AppAlert'
import { AppBadge } from '@/components/ui/AppBadge'
import { Chip } from '@/components/ui/chip'
import { MotionButton } from '@/components/ui/motion-button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import type { SecurityAlertResponse } from '@sentinel/contracts'
import {
  buildSecurityAlertDisplayItems,
  getSecurityAlertTone,
  type SecurityAlertDisplayItem,
} from './security-alerts-bar.logic'

/** Human-readable labels for alert types */
const ALERT_TYPE_LABELS: Record<string, string> = {
  member_missed_checkout: 'Missed Checkout',
  badge_unknown: 'Unknown Badge',
  badge_disabled: 'Disabled Badge',
  inactive_member: 'Inactive Member',
  unauthorized_access: 'Unauthorized Access',
  lockup_reminder: 'Lockup Reminder',
  lockup_not_executed: 'Lockup Not Executed',
  duty_watch_missing: 'Duty Watch Missing',
  duty_watch_not_checked_in: 'Duty Watch Not Checked In',
  building_not_secured: 'Building Not Secured',
  system: 'System',
}

function formatAlertType(alertType: string): string {
  return ALERT_TYPE_LABELS[alertType] ?? alertType.replace(/_/g, ' ')
}

const WIKI_BASE_URL = 'http://docs.sentinel.local'

function buildWikiUrl(slug: string): string {
  return `${WIKI_BASE_URL}/${slug.replace(/^\/+/, '')}`
}

function getAlertWikiSlug(alertType: string): string {
  if (
    alertType === 'lockup_reminder' ||
    alertType === 'lockup_not_executed' ||
    alertType === 'building_not_secured' ||
    alertType === 'member_missed_checkout' ||
    alertType === 'duty_watch_missing' ||
    alertType === 'duty_watch_not_checked_in'
  ) {
    return 'operations/dashboard/alerts/missed-lockup-follow-up'
  }

  if (
    alertType === 'badge_unknown' ||
    alertType === 'badge_disabled' ||
    alertType === 'inactive_member' ||
    alertType === 'unauthorized_access'
  ) {
    return 'operations/dashboard/security-alerts'
  }

  return 'operations/dashboard/security-alerts'
}

function WikiLink({ slug, children }: { slug: string; children: string }) {
  return (
    <a
      className="link inline-flex items-center gap-1.5 text-sm font-semibold"
      href={buildWikiUrl(slug)}
      target="_blank"
      rel="noreferrer"
    >
      <BookOpen className="h-4 w-4" />
      {children}
      <ExternalLink className="h-3.5 w-3.5" />
    </a>
  )
}

function getAlertIconClass(tone: ReturnType<typeof getSecurityAlertTone>): string {
  if (tone === 'warning') {
    return 'h-6 w-6 shrink-0 text-warning'
  }

  if (tone === 'info') {
    return 'h-6 w-6 shrink-0 text-info'
  }

  return 'h-6 w-6 shrink-0 text-error'
}

function SecurityAlertItem({ alert }: { alert: SecurityAlertResponse }) {
  const acknowledge = useAcknowledgeAlert()
  const member = useAuthStore((s) => s.member)
  const canAcknowledge = (member?.accountLevel ?? 0) >= AccountLevel.COMMAND
  const [dialogOpen, setDialogOpen] = useState(false)
  const [note, setNote] = useState('')
  const tone = getSecurityAlertTone(alert.severity)
  const wikiSlug = getAlertWikiSlug(alert.alertType)

  const handleAcknowledge = () => {
    acknowledge.mutate(
      { alertId: alert.id, note: note.trim() || undefined },
      {
        onSuccess: () => {
          setDialogOpen(false)
          setNote('')
        },
      }
    )
  }

  return (
    <>
      <AppAlert
        tone={tone}
        icon={<AlertCircle className={getAlertIconClass(tone)} />}
        heading={
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display font-bold">Security Alert</h3>
            <Chip variant="flat" color="danger" size="sm">
              {formatAlertType(alert.alertType)}
            </Chip>
            {alert.severity === 'critical' && (
              <AppBadge status="error" size="sm" pulse>
                Critical
              </AppBadge>
            )}
          </div>
        }
        description={
          <div className="space-y-2">
            <p className="text-sm font-semibold leading-6 sm:text-base">{alert.message}</p>
            <div className="flex flex-wrap items-center gap-(--space-2)">
              <WikiLink slug={wikiSlug}>What to check before acknowledging</WikiLink>
              <span className="text-sm leading-6 text-base-content/75">
                Confirm or escalate before clearing this alert.
              </span>
            </div>
          </div>
        }
        meta={<span className="font-mono">{new Date(alert.createdAt).toLocaleTimeString()}</span>}
        actions={
          <MotionButton
            className="btn btn-sm"
            data-help-id="dashboard.security-alerts.acknowledge"
            disabled={!canAcknowledge}
            onClick={() => setDialogOpen(true)}
            title={
              !member
                ? 'Sign in to acknowledge alerts'
                : !canAcknowledge
                  ? 'Command, Admin, or Developer level required'
                  : undefined
            }
          >
            Review
          </MotionButton>
        }
        className="shadow-lg"
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Review alert before acknowledging</DialogTitle>
            <DialogDescription>
              {formatAlertType(alert.alertType)}: {alert.message}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-(--space-3) py-2">
            <div className="rounded-box bg-warning-fadded p-(--space-3) text-warning-fadded-content">
              <p className="text-sm font-semibold">Acknowledge only after confirming the issue.</p>
              <p className="mt-1 text-sm leading-6">
                Use the Wiki procedure if you are unsure what should be checked or recorded.
              </p>
              <div className="mt-2">
                <WikiLink slug={wikiSlug}>Open procedure</WikiLink>
              </div>
            </div>
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Note (optional)</legend>
              <textarea
                id={`note-${alert.id}`}
                className="textarea w-full"
                placeholder="Reason for acknowledging, action taken, etc."
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </fieldset>
          </div>
          <DialogFooter>
            <DialogClose className="btn btn-outline">Cancel</DialogClose>
            <MotionButton
              className="btn btn-error"
              disabled={acknowledge.isPending}
              onClick={handleAcknowledge}
            >
              {acknowledge.isPending ? 'Acknowledging...' : 'Acknowledge'}
            </MotionButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function SecurityAlertGroupItem({
  group,
}: {
  group: Extract<SecurityAlertDisplayItem, { kind: 'group' }>
}) {
  const acknowledge = useAcknowledgeAlert()
  const member = useAuthStore((s) => s.member)
  const canAcknowledge = (member?.accountLevel ?? 0) >= AccountLevel.COMMAND
  const [dialogOpen, setDialogOpen] = useState(false)
  const [note, setNote] = useState('')
  const tone = getSecurityAlertTone(group.severity)

  const handleAcknowledgeAll = async () => {
    try {
      await Promise.all(
        group.alerts.map((alert) =>
          acknowledge.mutateAsync({
            alertId: alert.id,
            note: note.trim() || undefined,
            silent: true,
          })
        )
      )

      toast.success(`${group.alerts.length} related alerts acknowledged`)
      setDialogOpen(false)
      setNote('')
    } catch {
      // useAcknowledgeAlert owns the visible error toast.
    }
  }

  return (
    <>
      <AppAlert
        tone={tone}
        icon={<AlertCircle className={getAlertIconClass(tone)} />}
        heading={
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display font-bold">{group.label}</h3>
            <Chip variant="flat" color="warning" size="sm">
              DDS
            </Chip>
            <AppBadge status="neutral" size="sm">
              {group.alerts.length} related
            </AppBadge>
            {group.severity === 'critical' && (
              <AppBadge status="error" size="sm" pulse>
                Critical
              </AppBadge>
            )}
          </div>
        }
        description={
          <div className="space-y-2">
            <p className="text-sm font-semibold leading-6 sm:text-base">{group.summary}</p>
            <p className="text-sm leading-6 text-base-content/85">{group.nextStep}</p>
            <WikiLink slug={group.wikiSlug}>How to resolve missed lockup alerts</WikiLink>
          </div>
        }
        meta={
          <span className="font-mono">{new Date(group.latestCreatedAt).toLocaleTimeString()}</span>
        }
        actions={
          <MotionButton
            className="btn btn-sm"
            data-help-id="dashboard.security-alerts.review-dds"
            onClick={() => setDialogOpen(true)}
          >
            Review
          </MotionButton>
        }
        className="shadow-lg"
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>{group.label}</DialogTitle>
            <DialogDescription>{group.nextStep}</DialogDescription>
          </DialogHeader>
          <div className="space-y-(--space-3) py-2">
            <div className="rounded-box bg-error-fadded p-(--space-3) text-error-fadded-content">
              <p className="text-base font-semibold">{group.summary}</p>
              <p className="mt-1 text-sm leading-6">
                Do not clear these alerts until the real building state, duty/watch handoff, and
                attendance cleanup have been checked.
              </p>
              <div className="mt-2">
                <WikiLink slug={group.wikiSlug}>Open missed lockup procedure</WikiLink>
              </div>
            </div>
            <ul className="space-y-(--space-2)">
              {group.alerts.map((alert) => (
                <li
                  key={alert.id}
                  className="rounded-box border border-base-300 bg-base-100 p-(--space-3)"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip variant="flat" color="danger" size="sm">
                      {formatAlertType(alert.alertType)}
                    </Chip>
                    {alert.severity === 'critical' && (
                      <AppBadge status="error" size="sm">
                        Critical
                      </AppBadge>
                    )}
                    <span className="text-xs font-mono opacity-60">
                      {new Date(alert.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="mt-2 text-base leading-7">{alert.message}</p>
                </li>
              ))}
            </ul>
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Note for all alerts (optional)</legend>
              <textarea
                id="dds-alert-group-note"
                className="textarea w-full"
                placeholder="Reason for acknowledging, action taken, etc."
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </fieldset>
          </div>
          <DialogFooter>
            <DialogClose className="btn btn-outline">Cancel</DialogClose>
            <MotionButton
              className="btn btn-error"
              disabled={!canAcknowledge || acknowledge.isPending}
              onClick={handleAcknowledgeAll}
              title={
                !member
                  ? 'Sign in to acknowledge alerts'
                  : !canAcknowledge
                    ? 'Command, Admin, or Developer level required'
                    : undefined
              }
            >
              {acknowledge.isPending ? 'Acknowledging...' : 'Acknowledge all'}
            </MotionButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function SecurityAlertsList({ alerts }: { alerts: SecurityAlertResponse[] }) {
  const alertItems = buildSecurityAlertDisplayItems(alerts)

  return (
    <div className="space-y-2" data-help-id="dashboard.security-alerts">
      {alertItems
        .slice(0, 3)
        .map((item) =>
          item.kind === 'group' ? (
            <SecurityAlertGroupItem key={item.id} group={item} />
          ) : (
            <SecurityAlertItem key={item.id} alert={item.alert} />
          )
        )}

      {alertItems.length > 3 && (
        <p className="text-xs font-medium opacity-60">+{alertItems.length - 3} more alerts</p>
      )}
    </div>
  )
}

export function SecurityAlertsBar() {
  const { data, isLoading, isError } = useSecurityAlerts()

  if (isLoading) {
    return null
  }

  if (isError) {
    return (
      <div
        className="rounded-box border border-warning/35 bg-warning-fadded px-(--space-4) py-(--space-3) text-warning-fadded-content shadow-sm"
        data-help-id="dashboard.security-alerts"
        role="status"
      >
        <div className="flex items-center justify-between gap-(--space-3)">
          <div className="min-w-0">
            <p className="font-display text-sm font-semibold">Security alerts unavailable</p>
            <p className="mt-1 text-xs leading-5">
              Refresh once, then check System Status if alerts still do not load.
            </p>
          </div>
          <AppBadge status="warning" size="sm">
            Check
          </AppBadge>
        </div>
      </div>
    )
  }

  if (!data?.alerts || data.alerts.length === 0) {
    return null
  }

  return <SecurityAlertsList alerts={data.alerts} />
}
