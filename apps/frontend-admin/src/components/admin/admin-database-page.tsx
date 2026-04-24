'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { TableName } from '@sentinel/contracts'
import { Database } from 'lucide-react'
import { TableSidebar } from '@/components/database/table-sidebar'
import { DatabaseTable } from '@/components/database/database-table'
import { useTableList, useTableData } from '@/hooks/use-database-explorer'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

function AdminDatabasePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const initialTable = searchParams.get('table') as TableName | null
  const initialPage = parseInt(searchParams.get('page') || '1', 10)
  const initialLimit = parseInt(searchParams.get('limit') || '25', 10)
  const initialSortBy = searchParams.get('sortBy') || 'id'
  const initialSortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc'

  const [selectedTable, setSelectedTable] = useState<TableName | null>(initialTable)
  const [page, setPage] = useState(initialPage)
  const [limit, setLimit] = useState(initialLimit)
  const [sortBy, setSortBy] = useState(initialSortBy)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(initialSortOrder)

  const { data: tableListData, isLoading: isLoadingTables } = useTableList()

  const {
    data: tableData,
    isLoading: isLoadingData,
    isError: isDataError,
  } = useTableData({
    table: selectedTable,
    page,
    limit,
    sortBy,
    sortOrder,
  })

  useEffect(() => {
    const params = new globalThis.URLSearchParams()
    if (selectedTable) params.set('table', selectedTable)
    if (page !== 1) params.set('page', page.toString())
    if (limit !== 25) params.set('limit', limit.toString())
    if (sortBy !== 'id') params.set('sortBy', sortBy)
    if (sortOrder !== 'desc') params.set('sortOrder', sortOrder)

    const queryString = params.toString()
    const url = queryString ? `/admin/database?${queryString}` : '/admin/database'
    router.replace(url, { scroll: false })
  }, [selectedTable, page, limit, sortBy, sortOrder, router])

  const handleSelectTable = (table: TableName) => {
    setSelectedTable(table)
    setPage(1)
    setSortBy('id')
    setSortOrder('desc')
  }

  const handleSortChange = (newSortBy: string, newSortOrder: 'asc' | 'desc') => {
    setSortBy(newSortBy)
    setSortOrder(newSortOrder)
    setPage(1)
  }

  return (
    <div className="-m-4 flex min-h-[calc(100vh-9rem)] flex-1 lg:-m-6">
      <TableSidebar
        tables={tableListData?.tables ?? []}
        selectedTable={selectedTable}
        onSelectTable={handleSelectTable}
        isLoading={isLoadingTables}
      />

      <main className="min-w-0 flex-1 overflow-hidden p-(--space-6)">
        <h1 id="admin-page-title" className="sr-only">
          Database
        </h1>
        {selectedTable ? (
          <DatabaseTable
            data={tableData}
            isLoading={isLoadingData}
            isError={isDataError}
            page={page}
            limit={limit}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onPageChange={setPage}
            onLimitChange={setLimit}
            onSortChange={handleSortChange}
          />
        ) : (
          <div className="flex h-full items-center justify-center border border-base-300 bg-base-100 shadow-[var(--shadow-1)]">
            <div className="space-y-(--space-4) text-center">
              <Database className="mx-auto h-16 w-16 text-base-content/60" />
              <h2 className="text-xl font-medium">Database Explorer</h2>
              <p className="max-w-sm text-base-content/60">
                Select a table from the sidebar to view its data. This is a read-only view for
                controlled diagnostics.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export function AdminDatabasePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" className="text-base-content/60" />
        </div>
      }
    >
      <AdminDatabasePageContent />
    </Suspense>
  )
}
