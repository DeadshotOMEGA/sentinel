'use client'

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export function useEnums() {
  return useQuery({
    queryKey: ['enums'],
    queryFn: async () => {
      // Fetch all enum types in parallel
      const [ranksRes, memberStatusesRes, memberTypesRes] = await Promise.all([
        apiClient.ranks.list({ query: { active: 'true' } }),
        apiClient.enums.memberStatuses.getMemberStatuses(),
        apiClient.enums.memberTypes.getMemberTypes(),
      ])

      if (ranksRes.status !== 200) {
        throw new Error('Failed to fetch ranks')
      }
      if (memberStatusesRes.status !== 200) {
        throw new Error('Failed to fetch member statuses')
      }
      if (memberTypesRes.status !== 200) {
        throw new Error('Failed to fetch member types')
      }

      return {
        ranks: ranksRes.body.map((rank) => rank.code),
        rankDetails: ranksRes.body, // Full rank objects with displayOrder for sorting
        memberStatuses: memberStatusesRes.body.memberStatuses,
        memberTypes: memberTypesRes.body.memberTypes,
      }
    },
    staleTime: 1000 * 60 * 10, // 10 minutes (enums don't change)
  })
}
