/* global process */
'use client'

import { useState } from 'react'
import { CheckCheck, Plus, Radio } from 'lucide-react'
import { CheckinsTable } from '@/components/checkins/checkins-table'
import { CheckinsFilters } from '@/components/checkins/checkins-filters'
import { ManualCheckinModal } from '@/components/checkins/manual-checkin-modal'
import { SimulateScanModal } from '@/components/dev/simulate-scan-modal'
import { TID } from '@/lib/test-ids'
import { getCurrentDdsEditorId, canEditHistoryEntries } from '@/lib/history-permissions'
import { isSentinelBootstrapServiceNumber } from '@/lib/system-bootstrap'
import { useAuthStore, AccountLevel } from '@/store/auth-store'
import { useCurrentDds } from '@/hooks/use-schedules'

export default function CheckinsPage() {
  const member = useAuthStore((state) => state.member)
  const { data: currentDds } = useCurrentDds()
  const [isManualCheckinModalOpen, setIsManualCheckinModalOpen] = useState(false)
  const [isSimulateScanModalOpen, setIsSimulateScanModalOpen] = useState(false)
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

  const currentDdsMemberId = getCurrentDdsEditorId(currentDds)
  const canEditHistory = canEditHistoryEntries(member, currentDdsMemberId)
  const canCreateManualCheckin = canEditHistory
  const isDevMode = process.env.NODE_ENV === 'development'
  const isSentinelSystem = isSentinelBootstrapServiceNumber(member?.serviceNumber)
  const canSimulateScan =
    (member?.accountLevel ?? 0) >= AccountLevel.ADMIN && (isDevMode || isSentinelSystem)

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
        <div className="flex items-center gap-2">
          {canSimulateScan && (
            <button
              type="button"
              className="btn btn-outline btn-accent btn-md"
              onClick={() => setIsSimulateScanModalOpen(true)}
              aria-label="Simulate badge scan"
              data-testid={TID.dashboard.quickAction.simulateScan}
            >
              <Radio className="h-4 w-4 mr-2" aria-hidden="true" />
              Simulate Scan
            </button>
          )}

          {canCreateManualCheckin && (
            <button
              type="button"
              className="btn btn-primary btn-md"
              onClick={() => setIsManualCheckinModalOpen(true)}
              aria-label="Create manual check-in"
              data-testid={TID.checkins.manualCheckinBtn}
            >
              <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
              Manual Check-in
            </button>
          )}
        </div>
      </div>

      <CheckinsFilters filters={filters} onFilterChange={handleFilterChange} />

      <CheckinsTable
        filters={filters}
        canEdit={canEditHistory}
        onPageChange={(page) => handleFilterChange({ page })}
      />

      {canCreateManualCheckin && (
        <ManualCheckinModal
          open={isManualCheckinModalOpen}
          onOpenChange={setIsManualCheckinModalOpen}
        />
      )}

      {canSimulateScan && (
        <SimulateScanModal
          open={isSimulateScanModalOpen}
          onOpenChange={setIsSimulateScanModalOpen}
        />
      )}
    </div>
  )
}
