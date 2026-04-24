import { Suspense } from 'react'
import { SystemUpdatePanel } from '@/components/settings/system-update-panel'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function AdminUpdatesRoute() {
  return (
    <div className="space-y-(--space-4)">
      <h1 id="admin-page-title" className="sr-only">
        Updates
      </h1>
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" className="text-base-content/60" />
          </div>
        }
      >
        <SystemUpdatePanel />
      </Suspense>
    </div>
  )
}
