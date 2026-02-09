'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { MembersTable } from '@/components/members/members-table'
import { MembersFilters } from '@/components/members/members-filters'
import { MemberFormModal } from '@/components/members/member-form-modal'
import { NominalRollImportDialog } from '@/components/members/nominal-roll-import-dialog'

import { Plus, Upload, Loader2, RefreshCw } from 'lucide-react'
import { useSyncAllAutoQualifications } from '@/hooks/use-qualifications'
import { toast } from 'sonner'

function MembersPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get initial state from URL
  const initialPage = parseInt(searchParams.get('page') || '1', 10)
  const initialLimit = parseInt(searchParams.get('limit') || '200', 10)

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const syncAutoQuals = useSyncAllAutoQualifications()
  const [page, setPage] = useState(initialPage)
  const [limit, setLimit] = useState(initialLimit)
  const [filters, setFilters] = useState({
    divisionId: searchParams.get('divisionId') || undefined,
    rank: searchParams.get('rank') || undefined,
    status: searchParams.get('status') || undefined,
    search: searchParams.get('search') || undefined,
    qualificationCode: searchParams.get('qualificationCode') || undefined,
  })

  // Sync state to URL
  useEffect(() => {
    // eslint-disable-next-line no-undef -- URLSearchParams is a browser global
    const params = new URLSearchParams()
    if (page !== 1) params.set('page', page.toString())
    if (limit !== 200) params.set('limit', limit.toString())
    if (filters.divisionId) params.set('divisionId', filters.divisionId)
    if (filters.rank) params.set('rank', filters.rank)
    if (filters.status) params.set('status', filters.status)
    if (filters.search) params.set('search', filters.search)
    if (filters.qualificationCode) params.set('qualificationCode', filters.qualificationCode)

    const queryString = params.toString()
    const url = queryString ? `/members?${queryString}` : '/members'
    router.replace(url, { scroll: false })
  }, [page, limit, filters, router])

  const handleFilterChange = useCallback((newFilters: Partial<typeof filters>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
    }))
    setPage(1)
  }, [])

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage)
  }, [])

  const handleLimitChange = useCallback((newLimit: number) => {
    setLimit(newLimit)
    setPage(1)
  }, [])

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          <button
            className="btn btn-outline btn-md"
            onClick={() => {
              syncAutoQuals.mutate(undefined, {
                onSuccess: (data) => {
                  toast.success(
                    `Sync complete: ${data.granted} granted, ${data.revoked} revoked, ${data.unchanged} unchanged` +
                      (data.errors.length > 0 ? `, ${data.errors.length} errors` : '')
                  )
                },
                onError: () => {
                  toast.error('Failed to sync auto-qualifications')
                },
              })
            }}
            disabled={syncAutoQuals.isPending}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${syncAutoQuals.isPending ? 'animate-spin' : ''}`}
            />
            Sync Qualifications
          </button>
          <button className="btn btn-outline btn-md" onClick={() => setIsImportModalOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </button>
          <button className="btn btn-primary btn-md" onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Member
          </button>
        </div>
      </div>

      <MembersFilters filters={filters} onFilterChange={handleFilterChange} />

      <MembersTable
        filters={filters}
        page={page}
        limit={limit}
        onPageChange={handlePageChange}
        onLimitChange={handleLimitChange}
      />

      <MemberFormModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} mode="create" />
      <NominalRollImportDialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen} />
    </>
  )
}

export default function MembersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-base-content/60" />
        </div>
      }
    >
      <MembersPageContent />
    </Suspense>
  )
}
