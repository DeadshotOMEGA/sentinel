'use client'

import { AlertCircle } from 'lucide-react'
import { useSecurityAlerts } from '@/hooks/use-security-alerts'
import { AppBadge } from '@/components/ui/AppBadge'
import { Chip } from '@/components/ui/chip'
import type { SecurityAlertResponse } from '@sentinel/contracts'

export function SecurityAlertsBar() {
  const { data, isLoading } = useSecurityAlerts()

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
          className="alert alert-error alert-outline alert-vertical sm:alert-horizontal"
        >
          <AlertCircle className="h-5 w-5 shrink-0 stroke-current" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold">Security Alert</h3>
              <Chip variant="flat" color="danger" size="sm">
                {alert.alertType}
              </Chip>
              {alert.severity === 'critical' && (
                <AppBadge status="error" size="sm" pulse>
                  Critical
                </AppBadge>
              )}
            </div>
            <div className="text-xs">
              <span>{alert.message}</span>
              <span className="font-mono ml-2">
                {new Date(alert.createdAt).toLocaleTimeString()}
              </span>
            </div>
          </div>
          <div>
            <button
              className="btn btn-sm"
              disabled
              onClick={() => {
                // TODO: Implement acknowledge alert
              }}
            >
              Acknowledge
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
