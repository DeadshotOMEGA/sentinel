import * as React from 'react'
import { cn } from '@/lib/utils'

type AlertVariant = 'default' | 'destructive'

const variantClasses: Record<AlertVariant, string> = {
  default: '',
  destructive: 'alert-error',
}

function Alert({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'div'> & { variant?: AlertVariant }) {
  return <div role="alert" className={cn('alert', variantClasses[variant], className)} {...props} />
}

function AlertTitle({ className, ...props }: React.ComponentProps<'h5'>) {
  return <h5 className={cn('font-semibold', className)} {...props} />
}

function AlertDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('text-sm', className)} {...props} />
}

export { Alert, AlertTitle, AlertDescription }
