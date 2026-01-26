'use client'

import { useState } from 'react'
import { PageShell } from '@/components/layout/page-shell'
import { CheckinsTable } from '@/components/checkins/checkins-table'
import { CheckinsFilters } from '@/components/checkins/checkins-filters'
import { ManualCheckinModal } from '@/components/checkins/manual-checkin-modal'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'

export default function CheckinsPage() {
  const user = useAuthStore((state) => state.user)
  const [isManualCheckinModalOpen, setIsManualCheckinModalOpen] = useState(false)
  const [filters, setFilters] = useState({
    page: 1,
    limit: 25,
    memberId: undefined as string | undefined,
    divisionId: undefined as string | undefined,
    direction: undefined as string | undefined,
    startDate: undefined as string | undefined,
    endDate: undefined as string | undefined,
  })

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
      page: newFilters.page ?? 1, // Reset to page 1 when filters change
    }))
  }

  // Only admins and developers can create manual check-ins
  const canCreateManualCheckin = user?.role && ['developer', 'admin'].includes(user.role)

  return (
    <PageShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Check-ins</h1>
        {canCreateManualCheckin && (
          <Button onClick={() => setIsManualCheckinModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Manual Check-in
          </Button>
        )}
      </div>

      <CheckinsFilters filters={filters} onFilterChange={handleFilterChange} />

      <CheckinsTable filters={filters} onPageChange={(page) => handleFilterChange({ page })} />

      {canCreateManualCheckin && (
        <ManualCheckinModal
          open={isManualCheckinModalOpen}
          onOpenChange={setIsManualCheckinModalOpen}
        />
      )}
    </PageShell>
  )
}
