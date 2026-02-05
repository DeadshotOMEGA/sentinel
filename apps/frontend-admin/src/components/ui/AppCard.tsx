import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from './card'

/**
 * AppCard Variants
 * - default: Standard card styling
 * - elevated: Subtle gradient background with hover lift effect
 * - panel: Statistics panel styling
 * - stats: Alias for panel
 */
type AppCardVariant = 'default' | 'elevated' | 'panel' | 'stats'

/**
 * AppCard Status
 * Adds a semantic left border indicator
 */
type AppCardStatus = 'success' | 'warning' | 'error' | 'info' | 'neutral'

interface AppCardProps extends React.ComponentProps<typeof Card> {
  variant?: AppCardVariant
  status?: AppCardStatus
}

const variantClasses: Record<AppCardVariant, string> = {
  default: '',
  elevated: 'card-elevated',
  panel: 'stats-panel',
  stats: 'stats-panel',
}

const statusClasses: Record<AppCardStatus, string> = {
  success: 'status-indicator status-success',
  warning: 'status-indicator status-warning',
  error: 'status-indicator status-error',
  info: 'status-indicator status-info',
  neutral: 'status-indicator',
}

function AppCard({ className, variant = 'default', status, ...props }: AppCardProps) {
  return (
    <Card
      className={cn(variantClasses[variant], status && statusClasses[status], className)}
      {...props}
    />
  )
}

function AppCardHeader({ className, ...props }: React.ComponentProps<typeof CardHeader>) {
  return <CardHeader className={className} {...props} />
}

function AppCardTitle({ className, ...props }: React.ComponentProps<typeof CardTitle>) {
  return <CardTitle className={className} {...props} />
}

function AppCardDescription({ className, ...props }: React.ComponentProps<typeof CardDescription>) {
  return <CardDescription className={className} {...props} />
}

function AppCardAction({ className, ...props }: React.ComponentProps<typeof CardAction>) {
  return <CardAction className={className} {...props} />
}

function AppCardContent({ className, ...props }: React.ComponentProps<typeof CardContent>) {
  return <CardContent className={className} {...props} />
}

function AppCardFooter({ className, ...props }: React.ComponentProps<typeof CardFooter>) {
  return <CardFooter className={className} {...props} />
}

export {
  AppCard,
  AppCardHeader,
  AppCardTitle,
  AppCardDescription,
  AppCardAction,
  AppCardContent,
  AppCardFooter,
}

export type { AppCardVariant, AppCardStatus, AppCardProps }
