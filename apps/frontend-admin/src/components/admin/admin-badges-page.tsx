'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { BadgePlus, Plus } from 'lucide-react'
import { BadgesFilters } from '@/components/badges/badges-filters'
import { BadgesTable } from '@/components/badges/badges-table'
import { BadgeFormModal } from '@/components/badges/badge-form-modal'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { TID } from '@/lib/test-ids'

function AdminBadgesPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const initialPage = parseInt(searchParams.get('page') || '1', 10)
  const initialLimit = parseInt(searchParams.get('limit') || '50', 10)

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [page, setPage] = useState(initialPage)
  const [limit, setLimit] = useState(initialLimit)
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || undefined,
    status: searchParams.get('status') || undefined,
    assignmentType: searchParams.get('assignmentType') || undefined,
  })

  useEffect(() => {
    if (searchParams.get('action') !== 'create') {
      return
    }

    const params = new globalThis.URLSearchParams(searchParams.toString())
    params.delete('action')
    const queryString = params.toString()
    router.replace(queryString ? `/admin/badges?${queryString}` : '/admin/badges', {
      scroll: false,
    })

    const frameId = window.requestAnimationFrame(() => {
      setIsCreateModalOpen(true)
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [router, searchParams])

  useEffect(() => {
    const params = new globalThis.URLSearchParams()
    if (page !== 1) params.set('page', page.toString())
    if (limit !== 50) params.set('limit', limit.toString())
    if (filters.search) params.set('search', filters.search)
    if (filters.status) params.set('status', filters.status)
    if (filters.assignmentType) params.set('assignmentType', filters.assignmentType)

    const queryString = params.toString()
    const url = queryString ? `/admin/badges?${queryString}` : '/admin/badges'
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
    <div className="space-y-(--space-4)">
      <div className="flex items-center justify-between gap-(--space-4)">
        <div className="min-w-0">
          <h1
            id="admin-page-title"
            className="flex items-center gap-(--space-2) text-2xl font-bold"
          >
            <BadgePlus className="h-6 w-6" aria-hidden="true" />
            Badges
          </h1>
          <p className="text-sm text-base-content/60">
            Review and manage badge inventory, assignment, and operational status.
          </p>
        </div>
        <button
          className="btn btn-primary btn-md"
          onClick={() => setIsCreateModalOpen(true)}
          data-testid={TID.badges.newBadgeBtn}
        >
          <Plus className="mr-2 h-4 w-4" />
          New badge
        </button>
      </div>

      <BadgesFilters filters={filters} onFilterChange={handleFilterChange} />

      <BadgesTable
        filters={filters}
        page={page}
        limit={limit}
        onPageChange={handlePageChange}
        onLimitChange={handleLimitChange}
      />

      {isCreateModalOpen && (
        <BadgeFormModal
          open={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
          mode="create"
        />
      )}
    </div>
  )
}

export function AdminBadgesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" className="text-base-content/60" />
        </div>
      }
    >
      <AdminBadgesPageContent />
    </Suspense>
  )
}
