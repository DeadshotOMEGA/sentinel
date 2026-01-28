import * as React from 'react'
import { cn } from '@/lib/utils'

const variantClasses: Record<string, string> = {
  default: 'badge-primary',
  secondary: 'badge-secondary',
  destructive: 'badge-error',
  outline: 'badge-outline',
  ghost: 'badge-ghost',
}

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost'

interface BadgeProps extends React.ComponentProps<'span'> {
  variant?: BadgeVariant
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      data-variant={variant}
      className={cn('badge', variantClasses[variant], className)}
      {...props}
    />
  )
}

export { Badge }
export type { BadgeVariant }
