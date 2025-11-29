/**
 * Base Skeleton component for loading states
 *
 * Provides a simple pulse animation that respects user motion preferences.
 * Use this for custom skeleton layouts.
 *
 * @example
 * ```tsx
 * // Simple skeleton
 * <Skeleton width="100px" height="20px" />
 *
 * // Custom styling
 * <Skeleton className="w-full h-8" rounded="lg" />
 * ```
 */

interface SkeletonProps {
  /** Additional CSS classes */
  className?: string;
  /** Width (CSS value) */
  width?: string;
  /** Height (CSS value) */
  height?: string;
  /** Border radius preset */
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
}

const roundedClasses = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
} as const;

export function Skeleton({
  className = '',
  width,
  height,
  rounded = 'md',
}: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-neutral-200 ${roundedClasses[rounded]} ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}
