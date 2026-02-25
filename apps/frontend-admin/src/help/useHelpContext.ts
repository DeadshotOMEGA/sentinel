'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/auth-store'
import {
  getHelpContext,
  getLocalHelpFallback,
  getRegisteredHelpContext,
  resolveHelpContext,
  resolveRouteIdFromPathname,
  type HelpContext,
  type LocalHelpFallback,
} from './help-registry'
import {
  getActiveHelpStep,
  subscribeActiveHelpStep,
  type ActiveHelpStepDetail,
} from './help-events'

export interface ResolvedHelpContext extends HelpContext {
  helpSource: 'route' | 'driver_step'
  localFallback: LocalHelpFallback | null
}

export function useHelpContext(routeId?: string): ResolvedHelpContext {
  const pathname = usePathname()
  const member = useAuthStore((state) => state.member)
  const accountLevel = member?.accountLevel ?? 0
  const [activeStep, setActiveStep] = useState<ActiveHelpStepDetail | null>(() =>
    getActiveHelpStep()
  )

  useEffect(() => {
    return subscribeActiveHelpStep((detail) => {
      setActiveStep(detail)
    })
  }, [])

  return useMemo(() => {
    const explicitRouteId =
      routeId && !routeId.startsWith('/')
        ? routeId
        : routeId
          ? resolveRouteIdFromPathname(routeId)
          : resolveRouteIdFromPathname(pathname)

    const pathContext = resolveHelpContext(
      routeId?.startsWith('/') ? routeId : pathname,
      accountLevel
    )

    const baseContext = explicitRouteId
      ? (getHelpContext(explicitRouteId, accountLevel) ??
        getRegisteredHelpContext(explicitRouteId) ??
        pathContext)
      : pathContext

    const localFallback = getLocalHelpFallback(baseContext.routeId)

    const shouldUseStepHelp =
      activeStep &&
      activeStep.routeId === baseContext.routeId &&
      typeof activeStep.wikiSlug === 'string' &&
      activeStep.wikiSlug.trim().length > 0

    if (shouldUseStepHelp) {
      return {
        ...baseContext,
        wikiSlug: activeStep.wikiSlug as string,
        helpSource: 'driver_step',
        localFallback,
      }
    }

    return {
      ...baseContext,
      helpSource: 'route',
      localFallback,
    }
  }, [routeId, pathname, accountLevel, activeStep])
}
