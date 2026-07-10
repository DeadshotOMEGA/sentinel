export interface DashboardExampleSecurityAlertDetail {
  visible: boolean
}

const DASHBOARD_EXAMPLE_SECURITY_ALERT_EVENT = 'sentinel:dashboard-example-security-alert'

export function setDashboardExampleSecurityAlertVisible(visible: boolean): void {
  if (typeof window === 'undefined') return

  window.dispatchEvent(
    new window.CustomEvent<DashboardExampleSecurityAlertDetail>(
      DASHBOARD_EXAMPLE_SECURITY_ALERT_EVENT,
      {
        detail: { visible },
      }
    )
  )
}

export function subscribeDashboardExampleSecurityAlert(
  handler: (detail: DashboardExampleSecurityAlertDetail) => void
): () => void {
  if (typeof window === 'undefined') return () => undefined

  const listener = (event: Event) => {
    const customEvent = event as globalThis.CustomEvent<DashboardExampleSecurityAlertDetail>
    handler(customEvent.detail)
  }

  window.addEventListener(DASHBOARD_EXAMPLE_SECURITY_ALERT_EVENT, listener)
  return () => window.removeEventListener(DASHBOARD_EXAMPLE_SECURITY_ALERT_EVENT, listener)
}
