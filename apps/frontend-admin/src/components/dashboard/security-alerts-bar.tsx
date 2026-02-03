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
    <div role="alert" className="alert-security rounded-xl mb-4 p-4 flex items-start gap-3 animate-slide-in-left">
      <div className="p-2 rounded-lg bg-error/15 shrink-0">
        <AlertCircle className="h-5 w-5 text-error" />
      </div>

      <div className="flex-1 space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="font-display font-bold text-error-content">Security Alerts</h3>
          <span className="badge badge-error badge-sm font-mono">{alerts.length}</span>
        </div>

        <div className="space-y-2">
          {alerts.slice(0, 3).map((alert: SecurityAlertResponse, index: number) => (
            <div
              key={alert.id}
              className="flex items-center justify-between text-sm py-2 border-b border-error/10 last:border-b-0 animate-fade-in-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`badge badge-sm ${
                    alert.severity === 'critical' ? 'badge-error animate-status-pulse' : 'badge-ghost'
                  }`}
                >
                  {alert.alertType}
                </span>
                <span className="text-error-content/90">{alert.message}</span>
                <span className="text-xs text-error-content/50 font-mono">
                  {new Date(alert.createdAt).toLocaleTimeString()}
                </span>
              </div>
              <button
                className="btn btn-ghost btn-xs hover:btn-error hover:btn-outline transition-colors"
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
          <p className="text-xs text-error-content/60 font-medium">+{alerts.length - 3} more alerts</p>
        )}
      </div>

      <button
        className="btn btn-ghost btn-sm btn-square hover:bg-error/10 hover:text-error transition-colors"
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
