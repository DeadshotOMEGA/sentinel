import { LucideIcon } from 'lucide-react';
import { Inbox, Search, AlertCircle } from '../icons';

export type EmptyStateVariant = 'no-data' | 'no-results' | 'error';

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  icon?: LucideIcon;
  heading: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

/**
 * Icon size in pixels
 */
const ICON_SIZE = 48;

/**
 * Default icons for each variant
 * Icons are decorative - text conveys the meaning
 */
const DEFAULT_ICONS: Record<EmptyStateVariant, LucideIcon> = {
  'no-data': Inbox,
  'no-results': Search,
  error: AlertCircle,
} as const;

/**
 * EmptyState component for displaying empty data states with context
 *
 * Follows WCAG AA accessibility guidelines:
 * - Icons are decorative (aria-hidden)
 * - role="status" for screen readers
 * - Clear heading and description hierarchy
 * - High contrast text colors (gray-900, gray-500)
 * - Focusable action button with keyboard support
 *
 * @example
 * ```tsx
 * import { EmptyState } from '@sentinel/ui';
 *
 * // No results from search
 * <EmptyState
 *   heading="No members found"
 *   description="Try adjusting your search or filters"
 *   variant="no-results"
 * />
 *
 * // Empty list with action
 * <EmptyState
 *   heading="No events yet"
 *   description="Create your first event to get started"
 *   action={{
 *     label: "Create Event",
 *     onClick: () => setShowCreateModal(true)
 *   }}
 * />
 *
 * // Error state
 * <EmptyState
 *   variant="error"
 *   heading="Something went wrong"
 *   description="Unable to load data. Please try again later."
 * />
 *
 * // Custom icon
 * <EmptyState
 *   icon={Building}
 *   heading="No facilities found"
 *   description="Add a facility to get started"
 * />
 * ```
 */
export function EmptyState({
  variant = 'no-data',
  icon,
  heading,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  const IconComponent = icon ?? DEFAULT_ICONS[variant];

  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}
    >
      {/* Decorative icon */}
      <IconComponent
        size={ICON_SIZE}
        className="text-gray-400 mb-4"
        aria-hidden="true"
        focusable={false}
      />

      {/* Heading */}
      <h3 className="text-lg font-medium text-gray-900 mb-2">{heading}</h3>

      {/* Description */}
      {description && (
        <p className="text-sm text-gray-500 text-center max-w-md mb-4">
          {description}
        </p>
      )}

      {/* Optional action button */}
      {action && (
        <button
          onClick={action.onClick}
          className="text-primary hover:text-primary-dark font-medium transition-colors"
          type="button"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
