import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function DivisionStats({ divisions }) {
    if (divisions.length === 0) {
        return (_jsx("div", { className: "text-gray-500 text-xl", children: "No division data available" }));
    }
    return (_jsx("div", { className: "grid grid-cols-2 gap-6 w-full", children: divisions.map((division) => {
            const percentage = division.total > 0 ? (division.present / division.total) * 100 : 0;
            return (_jsxs("div", { className: "bg-white border border-gray-300 rounded-lg p-6 tv-mode", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsx("h3", { className: "text-2xl font-semibold text-gray-900", children: division.name }), _jsxs("div", { className: "text-xl text-gray-600", children: [division.present, "/", division.total] })] }), _jsx("div", { className: "w-full bg-gray-200 rounded-full h-3 overflow-hidden", children: _jsx("div", { className: "bg-emerald-600 h-full rounded-full transition-all", style: { width: `${percentage}%` } }) }), _jsxs("div", { className: "mt-2 text-lg font-medium text-gray-700", children: [Math.round(percentage), "%"] })] }, division.name));
        }) }));
}
