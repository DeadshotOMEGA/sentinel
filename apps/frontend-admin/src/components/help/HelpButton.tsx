'use client'

import { useMemo, useState } from 'react'
import { CircleHelp } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { cn } from '@/lib/utils'
import { useHelpContext } from '@/help/useHelpContext'
import { openHelpTarget } from '@/help/orchestrator'
import { TID } from '@/lib/test-ids'

interface HelpButtonProps {
  routeId?: string
  className?: string
  showLabel?: boolean
}

export function HelpButton({ routeId, className, showLabel = true }: HelpButtonProps) {
  const member = useAuthStore((state) => state.member)
  const helpContext = useHelpContext(routeId)
  const [isOpening, setIsOpening] = useState(false)

  const label = useMemo(() => {
    if (helpContext.helpSource === 'driver_step') {
      return 'Step Help'
    }

    return 'Help'
  }, [helpContext.helpSource])

  const handleOpenHelp = async () => {
    setIsOpening(true)

    try {
      await openHelpTarget({
        routeId: helpContext.routeId,
        accountLevel: member?.accountLevel,
        wikiSlug: helpContext.wikiSlug,
        source: 'help_button',
      })
    } finally {
      setIsOpening(false)
    }
  }

  return (
    <button
      type="button"
      className={cn('btn btn-ghost btn-sm gap-1.5', className)}
      onClick={() => {
        void handleOpenHelp()
      }}
      disabled={isOpening}
      aria-label={label}
      title={
        helpContext.helpSource === 'driver_step' ? 'Open help for active guided step' : 'Open help'
      }
      data-testid={TID.nav.helpBtn}
    >
      <CircleHelp className="h-4 w-4" />
      {showLabel && <span className="hidden sm:inline">{label}</span>}
    </button>
  )
}
