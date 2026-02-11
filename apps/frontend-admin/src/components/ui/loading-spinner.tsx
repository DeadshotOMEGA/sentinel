import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg'

const sizeClasses: Record<SpinnerSize, string> = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
}

interface LoadingSpinnerProps {
  size?: SpinnerSize
  label?: string
  className?: string
}

function LoadingSpinner({ size = 'md', label = 'Loading', className }: LoadingSpinnerProps) {
  return (
    <Loader2
      className={cn('animate-spin', sizeClasses[size], className)}
      aria-hidden="true"
      aria-label={label}
    />
  )
}

function ButtonSpinner({ className }: { className?: string }) {
  return <LoadingSpinner size="xs" className={cn('mr-2', className)} />
}

export { LoadingSpinner, ButtonSpinner }
export type { SpinnerSize, LoadingSpinnerProps }
