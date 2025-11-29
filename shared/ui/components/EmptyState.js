import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Inbox, Search, AlertCircle } from '../icons';
/**
 * Icon size in pixels
 */
const ICON_SIZE = 48;
/**
 * Default icons for each variant
 * Icons are decorative - text conveys the meaning
 */
const DEFAULT_ICONS = {
    'no-data': Inbox,
    'no-results': Search,
    error: AlertCircle,
};
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
export function EmptyState({ variant = 'no-data', icon, heading, description, action, className = '', }) {
    const IconComponent = icon ?? DEFAULT_ICONS[variant];
    return (_jsxs("div", { role: "status", className: `flex flex-col items-center justify-center py-12 px-4 ${className}`, children: [_jsx(IconComponent, { size: ICON_SIZE, className: "text-gray-400 mb-4", "aria-hidden": "true", focusable: false }), _jsx("h3", { className: "text-lg font-medium text-gray-900 mb-2", children: heading }), description && (_jsx("p", { className: "text-sm text-gray-500 text-center max-w-md mb-4", children: description })), action && (_jsx("button", { onClick: action.onClick, className: "text-primary hover:text-primary-dark font-medium transition-colors", type: "button", children: action.label }))] }));
}
