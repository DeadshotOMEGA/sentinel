'use client'

import { useState } from 'react'
import { AlertCircle } from 'lucide-react'
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

function SecurityAlertItem({ alert }: { alert: SecurityAlertResponse }) {
  const acknowledge = useAcknowledgeAlert()
  const member = useAuthStore((s) => s.member)
  const canAcknowledge = (member?.accountLevel ?? 0) >= AccountLevel.COMMAND
  const [dialogOpen, setDialogOpen] = useState(false)
  const [note, setNote] = useState('')

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
        tone="error"
        icon={<AlertCircle className="h-6 w-6 shrink-0 text-error" />}
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
        description={alert.message}
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
            Acknowledge
          </MotionButton>
        }
        className="shadow-lg"
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Acknowledge Alert</DialogTitle>
            <DialogDescription>
              {formatAlertType(alert.alertType)}: {alert.message}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
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

export function SecurityAlertsBar() {
  const { data, isLoading } = useSecurityAlerts()

  if (isLoading || !data?.alerts || data.alerts.length === 0) {
    return null
  }

  const alerts = data.alerts

  return (
    <div className="space-y-2 mb-4" data-help-id="dashboard.security-alerts">
      {alerts.slice(0, 3).map((alert: SecurityAlertResponse) => (
        <SecurityAlertItem key={alert.id} alert={alert} />
      ))}

      {alerts.length > 3 && (
        <p className="text-xs font-medium opacity-60">+{alerts.length - 3} more alerts</p>
      )}
    </div>
  )
}
