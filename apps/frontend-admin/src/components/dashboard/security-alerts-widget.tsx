'use client'

import { AlertCircle } from 'lucide-react'
import { useSecurityAlerts } from '@/hooks/use-security-alerts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { SecurityAlertResponse } from '@sentinel/contracts'

export function SecurityAlertsWidget() {
  const { data, isLoading, isError } = useSecurityAlerts()

  if (isError) {
    return (
      <div className="bg-card p-6 rounded-lg border shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <h2 className="text-lg font-semibold">Security Alerts</h2>
        </div>
        <p className="text-sm text-destructive">Failed to load security alerts</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="bg-card p-6 rounded-lg border shadow-sm">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="space-y-2">
            <div className="h-16 bg-muted rounded"></div>
            <div className="h-16 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  const alerts = data?.alerts ?? []

  return (
    <div className="bg-card p-6 rounded-lg border shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <h2 className="text-lg font-semibold">Security Alerts</h2>
        </div>
        {alerts.length > 0 && <Badge variant="destructive">{alerts.length}</Badge>}
      </div>

      {alerts.length > 0 ? (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {alerts.slice(0, 5).map((alert: SecurityAlertResponse) => (
            <div
              key={alert.id}
              className="flex items-start justify-between p-3 bg-destructive/10 rounded border border-destructive/20"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                    {alert.alertType}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(alert.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm">{alert.message}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="ml-2"
                onClick={() => {
                  // TODO: Implement acknowledge alert
                  console.log('Acknowledge alert:', alert.id)
                }}
              >
                Ack
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <AlertCircle className="h-12 w-12 mb-2 opacity-20" />
          <p className="text-sm">No active alerts</p>
        </div>
      )}
    </div>
  )
}
