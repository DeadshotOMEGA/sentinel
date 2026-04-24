import * as React from 'react'
import { CircleCheckBig, CircleX, Info, TriangleAlert, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { resolveAppAlertVariant, type AppAlertVariant } from './AppAlert.logic'

type AppAlertTone = 'info' | 'success' | 'warning' | 'error'

interface AppAlertProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  tone: AppAlertTone
  variant?: AppAlertVariant
  icon?: React.ReactNode | false
  heading?: React.ReactNode
  description?: React.ReactNode
  meta?: React.ReactNode
  actions?: React.ReactNode
  onDismiss?: () => void
  dismissLabel?: string
  children?: React.ReactNode
}

const singleLineToneClasses: Record<AppAlertTone, string> = {
  info: 'alert-info',
  success: 'alert-success',
  warning: 'alert-warning',
  error: 'alert-error',
}

const multiLineToneClasses: Record<AppAlertTone, string> = {
  info: 'border-info',
  success: 'border-success',
  warning: 'border-warning',
  error: 'border-error',
}

const multiLineIconToneClasses: Record<AppAlertTone, string> = {
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
}

const toneIcons: Record<AppAlertTone, React.ComponentType<React.ComponentProps<typeof Info>>> = {
  info: Info,
  success: CircleCheckBig,
  warning: TriangleAlert,
  error: CircleX,
}

function renderHeading(heading: React.ReactNode) {
  if (heading === null || heading === undefined) {
    return null
  }

  if (typeof heading === 'string' || typeof heading === 'number') {
    return <h3 className="font-bold">{heading}</h3>
  }

  return heading
}

function renderDefaultIcon(tone: AppAlertTone, variant: Exclude<AppAlertVariant, 'auto'>) {
  const Icon = toneIcons[tone]

  return (
    <Icon
      aria-hidden="true"
      className={cn(
        'h-6 w-6 shrink-0',
        variant === 'single-line' ? 'stroke-current' : multiLineIconToneClasses[tone]
      )}
    />
  )
}

function AppAlert({
  className,
  tone,
  variant = 'auto',
  icon,
  heading,
  description,
  meta,
  actions,
  onDismiss,
  dismissLabel = 'Dismiss alert',
  children,
  role,
  style,
  ...props
}: AppAlertProps) {
  const resolvedVariant = resolveAppAlertVariant({
    variant,
    heading,
    description,
    meta,
    actions,
  })
  const renderedIcon = icon === false ? null : (icon ?? renderDefaultIcon(tone, resolvedVariant))
  const dismissAction = onDismiss ? (
    <button
      type="button"
      className="btn btn-ghost btn-xs btn-square"
      onClick={onDismiss}
      aria-label={dismissLabel}
    >
      <X aria-hidden="true" className="h-4 w-4" />
    </button>
  ) : null

  if (resolvedVariant === 'single-line') {
    return (
      <div
        role={role ?? 'alert'}
        data-slot="app-alert"
        data-variant="single-line"
        className={cn('alert', singleLineToneClasses[tone], className)}
        {...props}
      >
        {renderedIcon}
        <span className="min-w-0">{children}</span>
        {dismissAction}
      </div>
    )
  }

  return (
    <div
      role={role ?? 'alert'}
      data-slot="app-alert"
      data-variant="multi-line"
      className={cn(
        'alert items-start gap-(--space-3) border-2 text-base-content alert-horizontal',
        multiLineToneClasses[tone],
        className
      )}
      style={{ backgroundColor: `var(--color-${tone}-fadded)`, ...style }}
      {...props}
    >
      {renderedIcon}
      <div className="min-w-0 flex-1 space-y-(--space-1)">
        {renderHeading(heading)}
        {description ? <div className="text-xs">{description}</div> : null}
        {children}
      </div>
      {meta ? <div className="text-xs text-base-content/70 sm:self-center">{meta}</div> : null}
      {actions || dismissAction ? (
        <div className="flex shrink-0 items-center gap-(--space-2) sm:self-center">
          {actions}
          {dismissAction}
        </div>
      ) : null}
    </div>
  )
}

export { AppAlert }
export type { AppAlertTone, AppAlertVariant, AppAlertProps }
