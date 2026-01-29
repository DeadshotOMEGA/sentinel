'use client'

import { useState } from 'react'
import { MembersTable } from '@/components/members/members-table'
import { MembersFilters } from '@/components/members/members-filters'
import { MemberFormModal } from '@/components/members/member-form-modal'
import { NominalRollImportDialog } from '@/components/members/nominal-roll-import-dialog'
import { Button } from '@/components/ui/button'
import { Plus, Upload } from 'lucide-react'

export default function MembersPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [filters, setFilters] = useState({
    divisionId: undefined as string | undefined,
    rank: undefined as string | undefined,
    status: undefined as string | undefined,
    search: undefined as string | undefined,
    qualificationCode: undefined as string | undefined,
  })

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
    }))
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsImportModalOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Member
          </Button>
        </div>
      </div>

      <MembersFilters filters={filters} onFilterChange={handleFilterChange} />

      <MembersTable filters={filters} />

      <MemberFormModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} mode="create" />
      <NominalRollImportDialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen} />
    </>
  )
}
