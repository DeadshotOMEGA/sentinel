import { Suspense } from 'react'
import { AdminReportsPage } from '@/components/admin/reports/AdminReportsPage'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function AdminReportsRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" className="text-base-content/60" />
        </div>
      }
    >
      <AdminReportsPage />
    </Suspense>
  )
}
