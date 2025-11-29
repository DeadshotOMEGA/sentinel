import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { statusColors } from '../tokens';
/**
 * Icon size in pixels
 */
const ICON_SIZE = 32;
/**
 * Get color styles for stats card variant
 */
function getVariantColors(variant) {
    if (!(variant in statusColors)) {
        throw new Error(`Invalid stats card variant: ${variant}. Valid variants: ${Object.keys(statusColors).join(', ')}`);
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
export function StatsCard({ value, label, variant = 'neutral', icon: IconComponent, loading = false, className = '', }) {
    const colors = getVariantColors(variant);
    if (loading) {
        return (_jsxs("div", { role: "region", "aria-label": `Loading ${label}`, className: `p-6 rounded-xl shadow-sm ${className}`, style: {
                backgroundColor: colors.bg,
            }, children: [_jsxs("div", { className: "flex items-start gap-4", children: [IconComponent && (_jsx("div", { className: "animate-pulse rounded", style: {
                                width: ICON_SIZE,
                                height: ICON_SIZE,
                                backgroundColor: colors.text,
                                opacity: 0.2,
                            }, "aria-hidden": "true" })), _jsxs("div", { className: "flex-1 space-y-3", children: [_jsx("div", { className: "animate-pulse rounded h-9 w-20", style: {
                                        backgroundColor: colors.text,
                                        opacity: 0.2,
                                    }, "aria-hidden": "true" }), _jsx("div", { className: "animate-pulse rounded h-5 w-16", style: {
                                        backgroundColor: colors.text,
                                        opacity: 0.1,
                                    }, "aria-hidden": "true" })] })] }), _jsxs("span", { className: "sr-only", children: ["Loading ", label, " statistics"] })] }));
    }
    return (_jsx("div", { role: "region", "aria-label": `${label}: ${value}`, className: `p-6 rounded-xl shadow-sm card-subtle ${className}`, style: {
            backgroundColor: colors.bg,
            color: colors.text,
        }, children: _jsxs("div", { className: "flex items-start gap-4", children: [IconComponent && (_jsx(IconComponent, { size: ICON_SIZE, "aria-hidden": "true", focusable: false, className: "flex-shrink-0" })), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "text-3xl font-bold leading-tight", children: value }), _jsx("div", { className: "text-sm mt-1 opacity-80", children: label })] })] }) }));
}
