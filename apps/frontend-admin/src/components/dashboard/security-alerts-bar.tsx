'use client'

import { AlertCircle, X } from 'lucide-react'
import { useSecurityAlerts } from '@/hooks/use-security-alerts'
import type { SecurityAlertResponse } from '@sentinel/contracts'

export function SecurityAlertsBar() {
  const { data, isLoading } = useSecurityAlerts()

  // Don't render anything while loading or if there are no alerts
  if (isLoading || !data?.alerts || data.alerts.length === 0) {
    return null
  }

  const alerts = data.alerts

  return (
    <div role="alert" className="alert alert-error mb-4">
      <AlertCircle className="h-5 w-5 shrink-0" />

      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Security Alerts</h3>
          <span className="badge badge-error badge-sm">{alerts.length}</span>
        </div>

        <div className="space-y-2">
          {alerts.slice(0, 3).map((alert: SecurityAlertResponse) => (
            <div key={alert.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`badge badge-sm ${
                    alert.severity === 'critical' ? 'badge-error' : 'badge-ghost'
                  }`}
                >
                  {alert.alertType}
                </span>
                <span>{alert.message}</span>
                <span className="text-xs text-error-content/60">
                  {new Date(alert.createdAt).toLocaleTimeString()}
                </span>
              </div>
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => {
                  // TODO: Implement acknowledge alert
                  console.log('Acknowledge alert:', alert.id)
                }}
              >
                Acknowledge
              </button>
            </div>
          ))}
        </div>

        {alerts.length > 3 && (
          <p className="text-xs text-error-content/60">+{alerts.length - 3} more alerts</p>
        )}
      </div>

      <button
        className="btn btn-ghost btn-sm btn-square"
        onClick={() => {
          // TODO: Implement dismiss all
          console.log('Dismiss all alerts')
        }}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
