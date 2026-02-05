import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * AppBadge Status
 * Required prop to enforce semantic usage.
 * Use Chip for decorative/categorical labels.
 */
type AppBadgeStatus = 'success' | 'warning' | 'error' | 'info' | 'neutral'

type AppBadgeSize = 'sm' | 'md' | 'lg'

interface AppBadgeProps extends Omit<React.ComponentProps<'span'>, 'children'> {
  /** Required - enforces semantic color usage */
  status: AppBadgeStatus
  /** Badge size */
  size?: AppBadgeSize
  /** Enable pulse animation for attention-requiring states */
  pulse?: boolean
  /** Badge content */
  children: React.ReactNode
}

const statusClasses: Record<AppBadgeStatus, string> = {
  success: 'badge-success',
  warning: 'badge-warning',
  error: 'badge-error',
  info: 'badge-info',
  neutral: 'badge-ghost',
}

const sizeClasses: Record<AppBadgeSize, string> = {
  sm: 'badge-sm',
  md: '',
  lg: 'badge-lg',
}

function AppBadge({
  className,
  status,
  size = 'md',
  pulse = false,
  children,
  ...props
}: AppBadgeProps) {
  return (
    <span
      role="status"
      data-slot="app-badge"
      data-status={status}
      className={cn(
        'badge',
        statusClasses[status],
        sizeClasses[size],
        pulse && 'animate-status-pulse',
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

export { AppBadge }
export type { AppBadgeStatus, AppBadgeSize, AppBadgeProps }
