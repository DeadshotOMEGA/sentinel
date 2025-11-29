import { jsx as _jsx } from "react/jsx-runtime";
const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
};
export function Skeleton({ className = '', width, height, rounded = 'md', }) {
    return (_jsx("div", { className: `animate-pulse bg-neutral-200 ${roundedClasses[rounded]} ${className}`, style: { width, height }, "aria-hidden": "true" }));
}
