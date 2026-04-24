'use client'

import { useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { AdminNavigationRouteId } from '@sentinel/contracts'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { recordAdminNavigationTelemetry } from '@/lib/admin-navigation-telemetry'
import { resolveLegacyAdminPath } from '@/lib/admin-routes'

export function LegacyAdminRedirect() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const target = resolveLegacyAdminPath(pathname, searchParams)

  useEffect(() => {
    if (!target) {
      router.replace('/admin')
      return
    }

    recordAdminNavigationTelemetry({
      eventType: 'legacy_redirect',
      routeId: 'legacy',
      targetRouteId: getTargetRouteId(target),
      sourceType: 'legacy-redirect',
    })
    router.replace(target)
  }, [router, target])

  return (
    <div className="flex min-h-80 items-center justify-center">
      <div className="flex items-center gap-(--space-3) text-sm text-base-content/70">
        <LoadingSpinner size="sm" className="text-base-content/60" />
        <span>Opening Admin Control Center...</span>
      </div>
    </div>
  )
}

function getTargetRouteId(target: string): AdminNavigationRouteId {
  if (target.startsWith('/admin/updates')) return 'updates'
  if (target.startsWith('/admin/network')) return 'network'
  if (target.startsWith('/admin/logs')) return 'logs'
  if (target.startsWith('/admin/database')) return 'database'
  if (target.startsWith('/admin/badges')) return 'badges'
  if (target.startsWith('/admin/config')) return 'config'

  return 'admin-home'
}
