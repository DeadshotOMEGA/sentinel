import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Skeleton } from './Skeleton';
export function TableSkeleton({ rows = 5, columns = 4, className = '', }) {
    if (rows < 1) {
        throw new Error('TableSkeleton rows must be at least 1');
    }
    if (columns < 1) {
        throw new Error('TableSkeleton columns must be at least 1');
    }
    return (_jsxs("div", { role: "status", "aria-label": "Loading table data", className: `w-full ${className}`, children: [_jsxs("table", { className: "w-full border-collapse", children: [_jsx("thead", { children: _jsx("tr", { className: "border-b border-neutral-200", children: Array.from({ length: columns }).map((_, colIndex) => (_jsx("th", { className: "px-4 py-3 text-left", children: _jsx(Skeleton, { height: "20px", width: colIndex === 0 ? '120px' : '80px' }) }, `header-${colIndex}`))) }) }), _jsx("tbody", { children: Array.from({ length: rows }).map((_, rowIndex) => (_jsx("tr", { className: "border-b border-neutral-100", children: Array.from({ length: columns }).map((_, colIndex) => (_jsx("td", { className: "px-4 py-3", children: _jsx(Skeleton, { height: "16px", width: colIndex === 0
                                        ? '100px'
                                        : colIndex === columns - 1
                                            ? '60px'
                                            : '80px' }) }, `cell-${rowIndex}-${colIndex}`))) }, `row-${rowIndex}`))) })] }), _jsx("span", { className: "sr-only", children: "Loading table data" })] }));
}
