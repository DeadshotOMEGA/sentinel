/**
 * BadgeChip Component
 *
 * Displays a badge status indicator using HeroUI's extendVariants
 * with semantic color variants for consistent theming.
 */

import { extendVariants, Chip, Tooltip } from '@heroui/react';

/** Badge status types */
export type BadgeStatusType = 'active' | 'disabled' | 'lost' | 'returned';

/** Extended chip with badge status variants */
export const StatusChip = extendVariants(Chip, {
  variants: {
    status: {
      active: {
        base: 'bg-success/20 border-success',
        dot: 'bg-success',
        content: 'text-success-600 dark:text-success-400',
      },
      disabled: {
        base: 'bg-danger/20 border-danger',
        dot: 'bg-danger',
        content: 'text-danger-600 dark:text-danger-400',
      },
      lost: {
        base: 'bg-warning/20 border-warning',
        dot: 'bg-warning',
        content: 'text-warning-600 dark:text-warning-400',
      },
      returned: {
        base: 'bg-secondary/20 border-secondary',
        dot: 'bg-secondary',
        content: 'text-secondary-600 dark:text-secondary-400',
      },
    },
  },
  defaultVariants: {
    size: 'sm',
    variant: 'dot',
  },
});

/** Badge data for display */
export interface BadgeChipBadge {
  serialNumber: string;
  status: BadgeStatusType;
}

export interface BadgeChipProps {
  /** Badge data - component renders null if undefined */
  badge?: BadgeChipBadge;
  /** Optional class name for additional styling */
  className?: string;
}

/**
 * BadgeChip displays a member's badge status with a dot indicator.
 * Shows serial number and status on hover via tooltip.
 * Returns null if no badge is provided.
 */
export function BadgeChip({ badge, className }: BadgeChipProps) {
  if (!badge) {
    return null;
  }

  const tooltipContent = `${badge.serialNumber} (${badge.status})`;

  return (
    <Tooltip content={tooltipContent}>
      <StatusChip status={badge.status} className={className}>
        Badge
      </StatusChip>
    </Tooltip>
  );
}

export default BadgeChip;
