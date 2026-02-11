'use client'

import { useState } from 'react'
import { CheckCheck, Plus } from 'lucide-react'
import { CheckinsTable } from '@/components/checkins/checkins-table'
import { CheckinsFilters } from '@/components/checkins/checkins-filters'
import { ManualCheckinModal } from '@/components/checkins/manual-checkin-modal'
import { useAuthStore, AccountLevel } from '@/store/auth-store'

export default function CheckinsPage() {
  const member = useAuthStore((state) => state.member)
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
  const canCreateManualCheckin = (member?.accountLevel ?? 0) >= AccountLevel.ADMIN

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CheckCheck className="h-6 w-6" aria-hidden="true" />
            Check-In/Out Records
          </h1>
          <p className="text-base-content/60">
            Review and manage member check-in and check-out records, including manual adjustments
            for special cases
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-md"
          onClick={() => setIsManualCheckinModalOpen(true)}
          aria-label="Create manual check-in"
        >
          <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
          Manual Check-in
        </button>
      </div>

      <CheckinsFilters filters={filters} onFilterChange={handleFilterChange} />

      <CheckinsTable filters={filters} onPageChange={(page) => handleFilterChange({ page })} />

      {canCreateManualCheckin && (
        <ManualCheckinModal
          open={isManualCheckinModalOpen}
          onOpenChange={setIsManualCheckinModalOpen}
        />
      )}
    </div>
  )
}
