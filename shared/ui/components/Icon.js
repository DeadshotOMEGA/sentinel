import { jsx as _jsx } from "react/jsx-runtime";
/**
 * Icon size variants mapped to pixel values
 */
const ICON_SIZES = {
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
};
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
export function Icon({ icon: IconComponent, size = 'md', className = '', 'aria-label': ariaLabel, 'aria-hidden': ariaHidden = false, }) {
    // Require aria-label for standalone icons (not hidden)
    if (!ariaHidden && !ariaLabel) {
        throw new Error('Icon: aria-label is required for standalone icons. Use aria-hidden for decorative icons.');
    }
    const pixelSize = ICON_SIZES[size];
    return (_jsx(IconComponent, { size: pixelSize, className: className, "aria-label": ariaLabel, "aria-hidden": ariaHidden, focusable: false }));
}
