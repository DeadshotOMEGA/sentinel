import { LucideIcon } from 'lucide-react';
import { statusColors } from '../tokens';

export type StatsCardVariant = 'success' | 'neutral' | 'info' | 'warning' | 'error';

interface StatsCardProps {
  value: number | string;
  label: string;
  variant?: StatsCardVariant;
  icon?: LucideIcon;
  loading?: boolean;
  className?: string;
}

/**
 * Icon size in pixels
 */
const ICON_SIZE = 32;

/**
 * Get color styles for stats card variant
 */
function getVariantColors(variant: StatsCardVariant): { bg: string; text: string } {
  if (!(variant in statusColors)) {
    throw new Error(
      `Invalid stats card variant: ${variant}. Valid variants: ${Object.keys(statusColors).join(', ')}`
    );
  }
  return statusColors[variant];
}

/**
 * StatsCard component for displaying key metrics with visual hierarchy
 *
 * Follows WCAG AA accessibility guidelines:
 * - Icons are decorative (aria-hidden)
 * - role="region" with aria-label for screen readers
 * - High contrast color combinations from tokens
 * - Loading state maintains dimensions
 *
 * @example
 * ```tsx
 * import { StatsCard } from '@sentinel/ui';
 * import { UserCheck } from '@sentinel/ui/icons';
 *
 * // Standard usage
 * <StatsCard
 *   value={23}
 *   label="Present"
 *   variant="success"
 *   icon={UserCheck}
 * />
 *
 * // With loading state
 * <StatsCard
 *   value={137}
 *   label="Absent"
 *   variant="neutral"
 *   icon={UserX}
 *   loading={isLoading}
 * />
 * ```
 */
export function StatsCard({
  value,
  label,
  variant = 'neutral',
  icon: IconComponent,
  loading = false,
  className = '',
}: StatsCardProps) {
  const colors = getVariantColors(variant);

  if (loading) {
    return (
      <div
        role="region"
        aria-label={`Loading ${label}`}
        className={`p-6 rounded-lg shadow-md ${className}`}
        style={{
          backgroundColor: colors.bg,
        }}
      >
        <div className="flex items-start gap-4">
          {/* Icon skeleton */}
          {IconComponent && (
            <div
              className="animate-pulse rounded"
              style={{
                width: ICON_SIZE,
                height: ICON_SIZE,
                backgroundColor: colors.text,
                opacity: 0.2,
              }}
              aria-hidden="true"
            />
          )}

          <div className="flex-1 space-y-3">
            {/* Value skeleton */}
            <div
              className="animate-pulse rounded h-9 w-20"
              style={{
                backgroundColor: colors.text,
                opacity: 0.2,
              }}
              aria-hidden="true"
            />

            {/* Label skeleton */}
            <div
              className="animate-pulse rounded h-5 w-16"
              style={{
                backgroundColor: colors.text,
                opacity: 0.1,
              }}
              aria-hidden="true"
            />
          </div>
        </div>
        <span className="sr-only">Loading {label} statistics</span>
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label={`${label}: ${value}`}
      className={`p-6 rounded-lg shadow-md ${className}`}
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
      }}
    >
      <div className="flex items-start gap-4">
        {/* Decorative icon */}
        {IconComponent && (
          <IconComponent
            size={ICON_SIZE}
            aria-hidden="true"
            focusable={false}
            className="flex-shrink-0"
          />
        )}

        <div className="flex-1 min-w-0">
          {/* Value */}
          <div className="text-3xl font-bold leading-tight">
            {value}
          </div>

          {/* Label */}
          <div className="text-sm mt-1 opacity-80">
            {label}
          </div>
        </div>
      </div>
    </div>
  );
}
