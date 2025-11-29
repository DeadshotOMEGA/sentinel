import { Skeleton } from './Skeleton';

/**
 * CardSkeleton component for loading card-based layouts
 *
 * Generic card skeleton with optional icon and configurable number of content lines.
 * Use for any card layout that isn't a StatsCard (which has its own loading state).
 *
 * @example
 * ```tsx
 * // Simple card skeleton
 * <CardSkeleton lines={2} />
 *
 * // Card with icon
 * <CardSkeleton showIcon lines={3} />
 *
 * // Grid of loading cards
 * <div className="grid grid-cols-3 gap-4">
 *   {Array.from({ length: 6 }).map((_, i) => (
 *     <CardSkeleton key={i} showIcon lines={2} />
 *   ))}
 * </div>
 * ```
 */

interface CardSkeletonProps {
  /** Show skeleton icon in header */
  showIcon?: boolean;
  /** Number of content lines to render */
  lines?: number;
  /** Additional CSS classes for card container */
  className?: string;
}

export function CardSkeleton({
  showIcon = true,
  lines = 2,
  className = '',
}: CardSkeletonProps) {
  if (lines < 1) {
    throw new Error('CardSkeleton lines must be at least 1');
  }

  return (
    <div
      role="status"
      aria-label="Loading card content"
      className={`p-6 rounded-xl shadow-sm bg-white border border-neutral-200 card-subtle ${className}`}
    >
      <div className="flex items-start gap-4">
        {/* Icon skeleton */}
        {showIcon && (
          <Skeleton width="32px" height="32px" rounded="md" />
        )}

        <div className="flex-1 space-y-3">
          {/* Header/title skeleton */}
          <Skeleton height="24px" width="120px" />

          {/* Content lines */}
          <div className="space-y-2">
            {Array.from({ length: lines }).map((_, index) => (
              <Skeleton
                key={`line-${index}`}
                height="16px"
                width={index === lines - 1 ? '80%' : '100%'}
              />
            ))}
          </div>
        </div>
      </div>
      <span className="sr-only">Loading card content</span>
    </div>
  );
}
