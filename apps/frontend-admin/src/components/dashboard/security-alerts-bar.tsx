'use client'

import { AlertCircle, X } from 'lucide-react'
import { useSecurityAlerts } from '@/hooks/use-security-alerts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { SecurityAlertResponse } from '@sentinel/contracts'

export function SecurityAlertsBar() {
  const { data, isLoading } = useSecurityAlerts()

  // Don't render anything while loading or if there are no alerts
  if (isLoading || !data?.alerts || data.alerts.length === 0) {
    return null
  }

  const alerts = data.alerts

  return (
    <div className="bg-destructive/10 border-l-4 border-destructive px-6 py-4 mb-6">
      <div className="flex items-start gap-4">
        <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />

        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-destructive">Security Alerts</h3>
            <Badge variant="destructive">{alerts.length}</Badge>
          </div>

          <div className="space-y-2">
            {alerts.slice(0, 3).map((alert: SecurityAlertResponse) => (
              <div key={alert.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                    {alert.alertType}
                  </Badge>
                  <span>{alert.message}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(alert.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // TODO: Implement acknowledge alert
                    console.log('Acknowledge alert:', alert.id)
                  }}
                >
                  Acknowledge
                </Button>
              </div>
            ))}
          </div>

          {alerts.length > 3 && (
            <p className="text-xs text-muted-foreground">+{alerts.length - 3} more alerts</p>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="flex-shrink-0"
          onClick={() => {
            // TODO: Implement dismiss all
            console.log('Dismiss all alerts')
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
