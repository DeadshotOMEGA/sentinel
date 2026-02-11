import { cn } from '@/lib/utils'

type SkeletonVariant = 'line' | 'circle' | 'card' | 'table-row'

interface LoadingSkeletonProps {
  variant?: SkeletonVariant
  width?: string
  height?: string
  count?: number
  className?: string
}

function LoadingSkeleton({
  variant = 'line',
  width,
  height,
  count = 1,
  className,
}: LoadingSkeletonProps) {
  const variantClasses: Record<SkeletonVariant, string> = {
    line: 'skeleton h-4 w-full',
    circle: 'skeleton h-10 w-10 rounded-full',
    card: 'skeleton h-32 w-full',
    'table-row': 'skeleton h-10 w-full',
  }

  const items = Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      className={cn(variantClasses[variant], className)}
      style={{ width, height }}
    />
  ))

  return count === 1 ? items[0] : <div className="flex flex-col gap-2">{items}</div>
}

function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex gap-4">
        {Array.from({ length: cols }, (_, i) => (
          <div key={i} className="skeleton h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }, (_, j) => (
            <div key={j} className="skeleton h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

function CardSkeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton h-32 w-full', className)} />
}

export { LoadingSkeleton, TableSkeleton, CardSkeleton }
export type { SkeletonVariant, LoadingSkeletonProps }
