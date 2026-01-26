'use client'

import { useState } from 'react'
import { PageShell } from '@/components/layout/page-shell'
import { MembersTable } from '@/components/members/members-table'
import { MembersFilters } from '@/components/members/members-filters'
import { MemberFormModal } from '@/components/members/member-form-modal'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default function MembersPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [filters, setFilters] = useState({
    page: 1,
    limit: 25,
    divisionId: undefined as string | undefined,
    rank: undefined as string | undefined,
    status: undefined as string | undefined,
    search: undefined as string | undefined,
  })

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
      page: newFilters.page ?? 1, // Reset to page 1 when filters change
    }))
  }

  return (
    <PageShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Members</h1>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Member
        </Button>
      </div>

      <MembersFilters filters={filters} onFilterChange={handleFilterChange} />

      <MembersTable filters={filters} onPageChange={(page) => handleFilterChange({ page })} />

      <MemberFormModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} mode="create" />
    </PageShell>
  )
}
