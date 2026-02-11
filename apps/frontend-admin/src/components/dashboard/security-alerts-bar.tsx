'use client'

import { AlertCircle } from 'lucide-react'
import { useSecurityAlerts, useAcknowledgeAlert } from '@/hooks/use-security-alerts'
import { useAuthStore } from '@/store/auth-store'
import { AppBadge } from '@/components/ui/AppBadge'
import { Chip } from '@/components/ui/chip'
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

export function SecurityAlertsBar() {
  const { data, isLoading } = useSecurityAlerts()
  const acknowledge = useAcknowledgeAlert()
  const member = useAuthStore((s) => s.member)

  if (isLoading || !data?.alerts || data.alerts.length === 0) {
    return null
  }

  const alerts = data.alerts

  return (
    <div className="space-y-2 mb-4">
      {alerts.slice(0, 3).map((alert: SecurityAlertResponse) => (
        <div
          key={alert.id}
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
              disabled={!member || acknowledge.isPending}
              onClick={() => acknowledge.mutate(alert.id)}
              title={!member ? 'Sign in to acknowledge alerts' : undefined}
            >
              {acknowledge.isPending ? 'Acknowledging...' : 'Acknowledge'}
            </button>
          </div>
        </div>
      ))}

      {alerts.length > 3 && (
        <p className="text-xs font-medium opacity-60">+{alerts.length - 3} more alerts</p>
      )}
    </div>
  )
}
