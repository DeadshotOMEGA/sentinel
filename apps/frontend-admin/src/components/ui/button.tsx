import * as React from 'react'
import { cn } from '@/lib/utils'

const variantClasses: Record<string, string> = {
  default: 'btn-primary',
  destructive: 'btn-error',
  outline: 'btn-outline',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  link: 'btn-link',
}

const sizeClasses: Record<string, string> = {
  default: 'btn-md',
  xs: 'btn-xs',
  sm: 'btn-sm',
  lg: 'btn-lg',
  icon: 'btn-square btn-md',
  'icon-xs': 'btn-square btn-xs',
  'icon-sm': 'btn-square btn-sm',
  'icon-lg': 'btn-square btn-lg',
}

type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
type ButtonSize = 'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg'

interface ButtonProps extends React.ComponentProps<'button'> {
  variant?: ButtonVariant
  size?: ButtonSize
  asChild?: boolean
}

function Button({
  className,
  variant = 'default',
  size = 'default',
  _asChild = false,
  ...props
}: ButtonProps) {
  return (
    <button
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn('btn', variantClasses[variant], sizeClasses[size], className)}
      {...props}
    />
  )
}

export { Button }
export type { ButtonVariant, ButtonSize }
