import { LucideIcon } from 'lucide-react';

/**
 * Icon size variants mapped to pixel values
 */
const ICON_SIZES = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
} as const;

interface IconProps {
  /** Lucide icon component from shared/ui/icons.ts */
  icon: LucideIcon;
  /** Size variant - defaults to 'md' (20px) */
  size?: keyof typeof ICON_SIZES;
  /** Additional CSS classes for color/spacing overrides */
  className?: string;
  /** Required for standalone icons (accessibility) */
  'aria-label'?: string;
  /** Optional aria-hidden for decorative icons */
  'aria-hidden'?: boolean;
}

/**
 * Icon wrapper component for Lucide React icons
 *
 * Provides consistent sizing and accessibility handling across Sentinel apps.
 *
 * @example
 * ```tsx
 * import { Icon } from '@sentinel/ui';
 * import { Users } from '@sentinel/ui/icons';
 *
 * // Standalone icon (requires aria-label)
 * <Icon icon={Users} size="lg" aria-label="Users" />
 *
 * // Decorative icon (inside button with text)
 * <Button>
 *   <Icon icon={Users} size="sm" aria-hidden />
 *   View Users
 * </Button>
 * ```
 */
export function Icon({
  icon: IconComponent,
  size = 'md',
  className = '',
  'aria-label': ariaLabel,
  'aria-hidden': ariaHidden = false,
}: IconProps) {
  // Require aria-label for standalone icons (not hidden)
  if (!ariaHidden && !ariaLabel) {
    throw new Error('Icon: aria-label is required for standalone icons. Use aria-hidden for decorative icons.');
  }

  const pixelSize = ICON_SIZES[size];

  return (
    <IconComponent
      size={pixelSize}
      className={className}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden}
      focusable={false}
    />
  );
}
