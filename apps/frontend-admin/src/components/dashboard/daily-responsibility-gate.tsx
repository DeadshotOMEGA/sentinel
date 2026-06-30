'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { KioskResponsibilityPrompt } from '@/components/kiosk/kiosk-responsibility-prompt'
import { useAcceptDds, useLoginResponsibilityState } from '@/hooks/use-dds'
import type { ResponsibilityActionChoice } from '@/components/kiosk/kiosk-responsibility-prompt.logic'
import { useOpenBuilding } from '@/hooks/use-lockup'
import { invalidateDashboardQueries } from '@/lib/dashboard-query-invalidation'
import { queryClient } from '@/lib/query-client'
import { useAuthStore } from '@/store/auth-store'

export function DailyResponsibilityGate() {
  const member = useAuthStore((state) => state.member)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const [dismissedMemberId, setDismissedMemberId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const loginStateQuery = useLoginResponsibilityState(isAuthenticated && Boolean(member?.id))
  const acceptDdsMutation = useAcceptDds()
  const openBuildingMutation = useOpenBuilding()

  const responsibilityState = loginStateQuery.data ?? null
  const shouldShowPrompt = Boolean(
    member &&
    responsibilityState?.shouldPrompt &&
    dismissedMemberId !== member.id &&
    !loginStateQuery.isLoading
  )
  const isPending =
    acceptDdsMutation.isPending || openBuildingMutation.isPending || loginStateQuery.isFetching

  const refreshResponsibilityState = async () => {
    await Promise.allSettled([
      loginStateQuery.refetch(),
      queryClient.invalidateQueries({ queryKey: ['dds-status'] }),
      queryClient.invalidateQueries({ queryKey: ['lockup-status'] }),
      invalidateDashboardQueries(queryClient),
    ])
  }

  const handleSubmit = async (action: ResponsibilityActionChoice) => {
    if (!member) {
      return
    }

    setErrorMessage(null)

    try {
      if (action === 'accept_dds') {
        await acceptDdsMutation.mutateAsync(member.id)
        toast.success('DDS responsibility accepted')
      } else {
        await openBuildingMutation.mutateAsync({
          memberId: member.id,
          data: { note: 'Opened from Sentinel login responsibility prompt' },
        })
        setDismissedMemberId(member.id)
        toast.warning('Building opened. DDS still needs to be accepted.')
      }

      await refreshResponsibilityState()
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to update daily responsibility.'
      )
    }
  }

  const handleDecline = () => {
    if (member) {
      setDismissedMemberId(member.id)
    }

    setErrorMessage(null)
  }

  if (!shouldShowPrompt || !responsibilityState) {
    return null
  }

  return (
    <KioskResponsibilityPrompt
      mode="login"
      state={responsibilityState}
      isPending={isPending}
      errorMessage={errorMessage}
      onDecline={handleDecline}
      onSubmit={handleSubmit}
    />
  )
}
