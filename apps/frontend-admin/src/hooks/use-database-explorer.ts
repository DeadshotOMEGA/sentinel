'use client'

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { TableName } from '@sentinel/contracts'

/**
 * Hook to fetch list of available database tables with row counts
 */
export function useTableList() {
  return useQuery({
    queryKey: ['database-explorer', 'tables'],
    queryFn: async () => {
      const response = await apiClient.databaseExplorer.listTables()
      if (response.status !== 200) {
        throw new Error('Failed to fetch table list')
      }
      return response.body
    },
    staleTime: 30000, // Cache for 30 seconds
  })
}

interface TableDataParams {
  table: TableName | null
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/**
 * Hook to fetch paginated data from a specific table
 */
export function useTableData({
  table,
  page = 1,
  limit = 25,
  sortBy,
  sortOrder,
}: TableDataParams) {
  return useQuery({
    queryKey: ['database-explorer', 'data', table, { page, limit, sortBy, sortOrder }],
    queryFn: async () => {
      if (!table) {
        throw new Error('No table selected')
      }

      const response = await apiClient.databaseExplorer.getTableData({
        params: { table },
        query: {
          page: page.toString(),
          limit: limit.toString(),
          sortBy,
          sortOrder,
        },
      })

      if (response.status !== 200) {
        throw new Error('Failed to fetch table data')
      }

      return response.body
    },
    enabled: !!table,
    staleTime: 10000, // Cache for 10 seconds
  })
}
