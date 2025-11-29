import { LucideIcon } from 'lucide-react';
import {
  CheckCircle,
  XCircle,
  DoorOpen,
  Check,
  X,
  Edit,
  Clock,
  AlertCircle,
  AlertTriangle,
  Info,
  HelpCircle,
} from '../icons';
import { badgeColors, statusColors } from '../tokens';

export type BadgeVariant =
  | 'present'
  | 'absent'
  | 'visitor'
  | 'active'
  | 'inactive'
  | 'draft'
  | 'pending'
  | 'excused'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral';

export type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  variant: BadgeVariant;
  size?: BadgeSize;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}

/**
 * Icon size in pixels per badge size
 */
const ICON_SIZES: Record<BadgeSize, number> = {
  sm: 12,
  md: 14,
  lg: 16,
} as const;

/**
 * Default icons for each variant
 * Icons are decorative - text conveys the meaning
 */
const DEFAULT_ICONS: Record<BadgeVariant, LucideIcon> = {
  present: CheckCircle,
  absent: XCircle,
  visitor: DoorOpen,
  active: Check,
  inactive: X,
  draft: Edit,
  pending: Clock,
  excused: HelpCircle,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
  info: Info,
  neutral: HelpCircle,
} as const;

/**
 * Get color styles for badge variant
 */
function getVariantColors(variant: BadgeVariant): { bg: string; text: string } {
  // Map badge-specific variants
  if (variant in badgeColors) {
    return badgeColors[variant as keyof typeof badgeColors];
  }

  // Map status variants
  if (variant in statusColors) {
    return statusColors[variant as keyof typeof statusColors];
  }

  throw new Error(
    `Invalid badge variant: ${variant}. Valid variants: ${Object.keys({ ...badgeColors, ...statusColors }).join(', ')}`
  );
}

/**
 * Get CSS classes for badge size
 */
function getSizeClasses(size: BadgeSize): string {
  switch (size) {
    case 'sm':
      return 'text-xs px-2 py-0.5 gap-1';
    case 'md':
      return 'text-sm px-2.5 py-1 gap-1.5';
    case 'lg':
      return 'text-base px-3 py-1.5 gap-2';
  }
}

/**
 * Badge component for status and state indicators
 *
 * Follows WCAG AA accessibility guidelines:
 * - Icons are decorative (aria-hidden)
 * - Text provides the semantic meaning
 * - High contrast color combinations from tokens
 * - role="status" for screen readers
 *
 * @example
 * ```tsx
 * import { Badge } from '@sentinel/ui';
 *
 * // Standard usage
 * <Badge variant="present">Checked In</Badge>
 *
 * // With size
 * <Badge variant="absent" size="lg">Absent</Badge>
 *
 * // Custom icon override
 * <Badge variant="visitor" icon={Building}>Official Visit</Badge>
 * ```
 */
export function Badge({
  variant,
  size = 'md',
  icon,
  children,
  className = '',
}: BadgeProps) {
  const IconComponent = icon ?? DEFAULT_ICONS[variant];
  const colors = getVariantColors(variant);
  const sizeClasses = getSizeClasses(size);
  const iconSize = ICON_SIZES[size];

  return (
    <span
      role="status"
      className={`inline-flex items-center font-medium rounded-full badge-appear ${sizeClasses} ${className}`}
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
      }}
    >
      <IconComponent size={iconSize} aria-hidden="true" focusable={false} />
      <span>{children}</span>
    </span>
  );
}
