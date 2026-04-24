import { Suspense } from 'react'
import { LegacyAdminRedirect } from '@/components/admin/legacy-admin-redirect'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function SettingsLegacyRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" className="text-base-content/60" />
        </div>
      }
    >
      <LegacyAdminRedirect />
    </Suspense>
  )
}
