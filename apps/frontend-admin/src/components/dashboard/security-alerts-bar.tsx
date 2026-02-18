'use client'

import { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { useSecurityAlerts, useAcknowledgeAlert } from '@/hooks/use-security-alerts'
import { useAuthStore } from '@/store/auth-store'
import { AppBadge } from '@/components/ui/AppBadge'
import { Chip } from '@/components/ui/chip'
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
  lockup_overdue: 'Lockup Overdue',
}

function formatAlertType(alertType: string): string {
  return ALERT_TYPE_LABELS[alertType] ?? alertType.replace(/_/g, ' ')
}

function SecurityAlertItem({ alert }: { alert: SecurityAlertResponse }) {
  const acknowledge = useAcknowledgeAlert()
  const member = useAuthStore((s) => s.member)
  const hasMinimumLevel = useAuthStore((s) => s.hasMinimumLevel)
  const canAcknowledge = member && hasMinimumLevel(5) // Admin (5) or Developer (6)
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
      <div
        role="alert"
        className="alert alert-error bg-base-100 text-error-content alert-outline outline-1 shadow-lg alert-vertical sm:alert-horizontal"
      >
        <AlertCircle className="h-5 w-5 shrink-0 stroke-current" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold">Security Alert</h3>
            <Chip variant="flat" color="danger" size="sm">
              {formatAlertType(alert.alertType)}
            </Chip>
            {alert.severity === 'critical' && (
              <AppBadge status="error" size="sm" pulse>
                Critical
              </AppBadge>
            )}
            <span className="ml-auto text-xs font-mono text-base-content/50">
              {new Date(alert.createdAt).toLocaleTimeString()}
            </span>
          </div>
          <p className="text-xs mt-1">{alert.message}</p>
        </div>
        <div>
          <button
            className="btn btn-sm"
            data-help-id="dashboard.security-alerts.acknowledge"
            disabled={!canAcknowledge}
            onClick={() => setDialogOpen(true)}
            title={
              !member
                ? 'Sign in to acknowledge alerts'
                : !canAcknowledge
                  ? 'Admin or Developer level required'
                  : undefined
            }
          >
            Acknowledge
          </button>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Acknowledge Alert</DialogTitle>
            <DialogDescription>
              {formatAlertType(alert.alertType)}: {alert.message}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="label" htmlFor={`note-${alert.id}`}>
              <span className="label-text">Note (optional)</span>
            </label>
            <textarea
              id={`note-${alert.id}`}
              className="textarea textarea-bordered w-full"
              placeholder="Reason for acknowledging, action taken, etc."
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <DialogFooter>
            <DialogClose className="btn btn-outline">Cancel</DialogClose>
            <button
              className="btn btn-error"
              disabled={acknowledge.isPending}
              onClick={handleAcknowledge}
            >
              {acknowledge.isPending ? 'Acknowledging...' : 'Acknowledge'}
            </button>
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
