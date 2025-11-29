import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Skeleton } from './Skeleton';
export function CardSkeleton({ showIcon = true, lines = 2, className = '', }) {
    if (lines < 1) {
        throw new Error('CardSkeleton lines must be at least 1');
    }
    return (_jsxs("div", { role: "status", "aria-label": "Loading card content", className: `p-6 rounded-xl shadow-sm bg-white border border-neutral-200 card-subtle ${className}`, children: [_jsxs("div", { className: "flex items-start gap-4", children: [showIcon && (_jsx(Skeleton, { width: "32px", height: "32px", rounded: "md" })), _jsxs("div", { className: "flex-1 space-y-3", children: [_jsx(Skeleton, { height: "24px", width: "120px" }), _jsx("div", { className: "space-y-2", children: Array.from({ length: lines }).map((_, index) => (_jsx(Skeleton, { height: "16px", width: index === lines - 1 ? '80%' : '100%' }, `line-${index}`))) })] })] }), _jsx("span", { className: "sr-only", children: "Loading card content" })] }));
}
