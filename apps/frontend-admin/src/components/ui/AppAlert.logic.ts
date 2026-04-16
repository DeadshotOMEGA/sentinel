import type { ReactNode } from 'react'

type AppAlertVariant = 'auto' | 'single-line' | 'multi-line'

interface AppAlertVariantInput {
  variant?: AppAlertVariant
  heading?: ReactNode
  description?: ReactNode
  meta?: ReactNode
  actions?: ReactNode
}

function resolveAppAlertVariant({
  variant,
  heading,
  description,
  meta,
  actions,
}: AppAlertVariantInput): Exclude<AppAlertVariant, 'auto'> {
  if (variant && variant !== 'auto') {
    return variant
  }

  return heading || description || meta || actions ? 'multi-line' : 'single-line'
}

export { resolveAppAlertVariant }
export type { AppAlertVariant, AppAlertVariantInput }
