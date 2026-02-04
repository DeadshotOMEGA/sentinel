/* global HTMLSpanElement */
import * as React from 'react'
import { cn } from '@/lib/utils'

export type ChipVariant = 'solid' | 'bordered' | 'light' | 'flat' | 'faded' | 'shadow' | 'dot'
export type ChipColor =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'blue'
  | 'green'
  | 'pink'
  | 'purple'
  | 'red'
  | 'yellow'
  | 'cyan'
  | 'zinc'
export type ChipSize = 'sm' | 'md' | 'lg'

const baseClasses =
  'inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 gap-1.5 transition-all'

const sizeClasses: Record<ChipSize, string> = {
  sm: 'px-2 py-0.5 text-xs gap-1',
  md: 'px-2.5 py-1 text-sm gap-1.5',
  lg: 'px-3 py-1.5 text-base gap-2',
}

const variantColorClasses: Record<ChipVariant, Record<ChipColor, string>> = {
  solid: {
    default: 'bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200',
    primary: 'bg-primary text-primary-content',
    secondary: 'bg-secondary text-secondary-content',
    success: 'bg-emerald-500 text-white',
    warning: 'bg-amber-500 text-white',
    danger: 'bg-red-500 text-white',
    blue: 'bg-blue-500 text-white dark:bg-blue-600',
    green: 'bg-green-500 text-white dark:bg-green-600',
    pink: 'bg-pink-500 text-white dark:bg-pink-600',
    purple: 'bg-purple-500 text-white dark:bg-purple-600',
    red: 'bg-red-500 text-white dark:bg-red-600',
    yellow: 'bg-yellow-500 text-white dark:bg-yellow-600',
    cyan: 'bg-cyan-500 text-white dark:bg-cyan-600',
    zinc: 'bg-zinc-500 text-white dark:bg-zinc-600',
  },
  bordered: {
    default:
      'border-2 bg-transparent border-zinc-300 text-zinc-700 dark:border-zinc-600 dark:text-zinc-300',
    primary: 'border-2 bg-transparent border-primary text-primary',
    secondary: 'border-2 bg-transparent border-secondary text-secondary-content',
    success: 'border-2 bg-transparent border-emerald-500 text-emerald-600 dark:text-emerald-400',
    warning: 'border-2 bg-transparent border-amber-500 text-amber-600 dark:text-amber-400',
    danger: 'border-2 bg-transparent border-red-500 text-red-600 dark:text-red-400',
    blue: 'border-2 bg-transparent border-blue-500 text-blue-600 dark:text-blue-400',
    green: 'border-2 bg-transparent border-green-500 text-green-600 dark:text-green-400',
    pink: 'border-2 bg-transparent border-pink-500 text-pink-600 dark:text-pink-400',
    purple: 'border-2 bg-transparent border-purple-500 text-purple-600 dark:text-purple-400',
    red: 'border-2 bg-transparent border-red-500 text-red-600 dark:text-red-400',
    yellow: 'border-2 bg-transparent border-yellow-500 text-yellow-600 dark:text-yellow-400',
    cyan: 'border-2 bg-transparent border-cyan-500 text-cyan-600 dark:text-cyan-400',
    zinc: 'border-2 bg-transparent border-zinc-500 text-zinc-600 dark:text-zinc-400',
  },
  light: {
    default: 'bg-zinc-500/20 text-zinc-700 dark:text-zinc-300',
    primary: 'bg-primary/20 text-primary dark:text-primary',
    secondary: 'bg-secondary/40 text-secondary-content',
    success: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
    warning: 'bg-amber-500/20 text-amber-700 dark:text-amber-400',
    danger: 'bg-red-500/20 text-red-700 dark:text-red-400',
    blue: 'bg-blue-500/20 text-blue-700 dark:text-blue-400',
    green: 'bg-green-500/20 text-green-700 dark:text-green-400',
    pink: 'bg-pink-500/20 text-pink-700 dark:text-pink-400',
    purple: 'bg-purple-500/20 text-purple-700 dark:text-purple-400',
    red: 'bg-red-500/20 text-red-700 dark:text-red-400',
    yellow: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
    cyan: 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-400',
    zinc: 'bg-zinc-500/20 text-zinc-700 dark:text-zinc-400',
  },
  flat: {
    default: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
    primary: 'bg-primary/15 text-primary',
    secondary: 'bg-secondary/50 text-secondary-content',
    success: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    warning: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    danger: 'bg-red-500/15 text-red-700 dark:text-red-400',
    blue: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
    green: 'bg-green-500/15 text-green-700 dark:text-green-400',
    pink: 'bg-pink-500/15 text-pink-700 dark:text-pink-400',
    purple: 'bg-purple-500/15 text-purple-700 dark:text-purple-400',
    red: 'bg-red-500/15 text-red-700 dark:text-red-400',
    yellow: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400',
    cyan: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400',
    zinc: 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-400',
  },
  faded: {
    default:
      'border border-zinc-500 bg-zinc-500/10 text-zinc-500 dark:border-zinc-400 dark:bg-zinc-400/20 dark:text-zinc-400',
    primary:
      'border border-primary bg-primary/10 text-primary dark:border-primary dark:bg-primary/20 dark:text-primary',
    secondary:
      'border border-secondary bg-secondary/10 text-secondary dark:border-secondary dark:bg-secondary/20 dark:text-secondary',
    success:
      'border border-emerald-500 bg-emerald-500/10 text-emerald-500 dark:border-emerald-400 dark:bg-emerald-400/20 dark:text-emerald-400',
    warning:
      'border border-amber-500 bg-amber-500/10 text-amber-500 dark:border-amber-400 dark:bg-amber-400/20 dark:text-amber-400',
    danger:
      'border border-red-500 bg-red-500/10 text-red-500 dark:border-red-400 dark:bg-red-400/20 dark:text-red-400',
    blue: 'border border-blue-500 bg-blue-500/10 text-blue-500 dark:border-blue-400 dark:bg-blue-400/20 dark:text-blue-400',
    green:
      'border border-green-500 bg-green-500/10 text-green-500 dark:border-green-400 dark:bg-green-400/20 dark:text-green-400',
    pink: 'border border-pink-500 bg-pink-500/10 text-pink-500 dark:border-pink-400 dark:bg-pink-400/20 dark:text-pink-400',
    purple:
      'border border-purple-500 bg-purple-500/10 text-purple-500 dark:border-purple-400 dark:bg-purple-400/20 dark:text-purple-400',
    red: 'border border-red-500 bg-red-500/10 text-red-500 dark:border-red-400 dark:bg-red-400/20 dark:text-red-400',
    yellow:
      'border border-yellow-500 bg-yellow-500/10 text-yellow-500 dark:border-yellow-400 dark:bg-yellow-400/20 dark:text-yellow-400',
    cyan: 'border border-cyan-500 bg-cyan-500/10 text-cyan-500 dark:border-cyan-400 dark:bg-cyan-400/20 dark:text-cyan-400',
    zinc: 'border border-zinc-500 bg-zinc-500/10 text-zinc-500 dark:border-zinc-400 dark:bg-zinc-400/20 dark:text-zinc-400',
  },
  shadow: {
    default:
      'bg-zinc-200 text-zinc-800 shadow-md shadow-zinc-400/50 dark:bg-zinc-700 dark:text-zinc-200 dark:shadow-zinc-900/50',
    primary: 'bg-primary text-primary-content shadow-md shadow-primary/40',
    secondary: 'bg-secondary text-secondary-content shadow-md shadow-secondary/40',
    success: 'bg-emerald-500 text-white shadow-md shadow-emerald-500/40',
    warning: 'bg-amber-500 text-white shadow-md shadow-amber-500/40',
    danger: 'bg-red-500 text-white shadow-md shadow-red-500/40',
    blue: 'bg-blue-500 text-white shadow-md shadow-blue-500/40',
    green: 'bg-green-500 text-white shadow-md shadow-green-500/40',
    pink: 'bg-pink-500 text-white shadow-md shadow-pink-500/40',
    purple: 'bg-purple-500 text-white shadow-md shadow-purple-500/40',
    red: 'bg-red-500 text-white shadow-md shadow-red-500/40',
    yellow: 'bg-yellow-500 text-white shadow-md shadow-yellow-500/40',
    cyan: 'bg-cyan-500 text-white shadow-md shadow-cyan-500/40',
    zinc: 'bg-zinc-500 text-white shadow-md shadow-zinc-500/40',
  },
  dot: {
    default: 'bg-transparent text-zinc-700 dark:text-zinc-300',
    primary: 'bg-transparent text-primary',
    secondary: 'bg-transparent text-secondary-content',
    success: 'bg-transparent text-emerald-700 dark:text-emerald-400',
    warning: 'bg-transparent text-amber-700 dark:text-amber-400',
    danger: 'bg-transparent text-red-700 dark:text-red-400',
    blue: 'bg-transparent text-blue-700 dark:text-blue-400',
    green: 'bg-transparent text-green-700 dark:text-green-400',
    pink: 'bg-transparent text-pink-700 dark:text-pink-400',
    purple: 'bg-transparent text-purple-700 dark:text-purple-400',
    red: 'bg-transparent text-red-700 dark:text-red-400',
    yellow: 'bg-transparent text-yellow-700 dark:text-yellow-400',
    cyan: 'bg-transparent text-cyan-700 dark:text-cyan-400',
    zinc: 'bg-transparent text-zinc-700 dark:text-zinc-400',
  },
}

const dotColorClasses: Record<string, string> = {
  default: 'bg-zinc-500',
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  pink: 'bg-pink-500',
  purple: 'bg-purple-500',
  red: 'bg-red-500',
  yellow: 'bg-yellow-500',
  cyan: 'bg-cyan-500',
  zinc: 'bg-zinc-500',
}

const dotSizeClasses: Record<string, string> = {
  sm: 'size-1.5',
  md: 'size-2',
  lg: 'size-2.5',
}

export interface ChipProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'color'> {
  variant?: ChipVariant
  color?: ChipColor
  size?: ChipSize
  showDot?: boolean
}

function Chip({
  className,
  variant = 'solid',
  color = 'default',
  size = 'md',
  showDot,
  children,
  ...props
}: ChipProps) {
  const shouldShowDot = showDot || variant === 'dot'

  return (
    <span
      data-slot="chip"
      data-variant={variant}
      data-color={color}
      className={cn(baseClasses, sizeClasses[size], variantColorClasses[variant][color], className)}
      {...props}
    >
      {shouldShowDot && (
        <span
          className={cn('rounded-full shrink-0', dotColorClasses[color], dotSizeClasses[size])}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  )
}

export const fadedColorClasses = variantColorClasses.faded

export { Chip }
