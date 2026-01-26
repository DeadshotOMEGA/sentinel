'use client'

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export function useDivisions() {
  return useQuery({
    queryKey: ['divisions'],
    queryFn: async () => {
      const response = await apiClient.divisions.getDivisions()
      if (response.status !== 200) {
        throw new Error('Failed to fetch divisions')
      }
      return response.body
    },
    staleTime: 1000 * 60 * 10, // 10 minutes (divisions don't change often)
  })
}
