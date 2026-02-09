'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { TableSidebar } from '@/components/database/table-sidebar'
import { DatabaseTable } from '@/components/database/database-table'
import { useTableList, useTableData } from '@/hooks/use-database-explorer'
import { Database } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import type { TableName } from '@sentinel/contracts'

function DatabasePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get initial state from URL
  const initialTable = searchParams.get('table') as TableName | null
  const initialPage = parseInt(searchParams.get('page') || '1', 10)
  const initialLimit = parseInt(searchParams.get('limit') || '25', 10)
  const initialSortBy = searchParams.get('sortBy') || 'id'
  const initialSortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc'

  // State
  const [selectedTable, setSelectedTable] = useState<TableName | null>(initialTable)
  const [page, setPage] = useState(initialPage)
  const [limit, setLimit] = useState(initialLimit)
  const [sortBy, setSortBy] = useState(initialSortBy)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(initialSortOrder)

  // Fetch table list
  const { data: tableListData, isLoading: isLoadingTables } = useTableList()

  // Fetch selected table data
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

  // Update URL when state changes
  useEffect(() => {
    const params = new globalThis.URLSearchParams()
    if (selectedTable) params.set('table', selectedTable)
    if (page !== 1) params.set('page', page.toString())
    if (limit !== 25) params.set('limit', limit.toString())
    if (sortBy !== 'id') params.set('sortBy', sortBy)
    if (sortOrder !== 'desc') params.set('sortOrder', sortOrder)

    const queryString = params.toString()
    const url = queryString ? `/database?${queryString}` : '/database'
    router.replace(url, { scroll: false })
  }, [selectedTable, page, limit, sortBy, sortOrder, router])

  // Handle table selection
  const handleSelectTable = (table: TableName) => {
    setSelectedTable(table)
    setPage(1)
    setSortBy('id')
    setSortOrder('desc')
  }

  // Handle sort change
  const handleSortChange = (newSortBy: string, newSortOrder: 'asc' | 'desc') => {
    setSortBy(newSortBy)
    setSortOrder(newSortOrder)
    setPage(1)
  }

  return (
    <div className="flex flex-1 -m-4 lg:-m-6">
      {/* Sidebar */}
      <TableSidebar
        tables={tableListData?.tables ?? []}
        selectedTable={selectedTable}
        onSelectTable={handleSelectTable}
        isLoading={isLoadingTables}
      />

      {/* Main content */}
      <main className="flex-1 p-6 overflow-hidden">
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
          <div className="h-full flex items-center justify-center bg-base-100 border">
            <div className="text-center space-y-4">
              <Database className="h-16 w-16 mx-auto text-base-content/60" />
              <h2 className="text-xl font-medium">Database Explorer</h2>
              <p className="text-base-content/60 max-w-sm">
                Select a table from the sidebar to view its data. This is a read-only view for
                exploring the database structure and contents.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default function DatabasePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" className="text-base-content/60" />
        </div>
      }
    >
      <DatabasePageContent />
    </Suspense>
  )
}
