import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function ConnectionStatus({ isConnected }) {
    if (isConnected) {
        return null;
    }
    return (_jsxs("div", { className: "fixed bottom-4 right-4 flex items-center gap-3 bg-white px-4 py-3 rounded-lg shadow-lg border border-red-200", children: [_jsx("div", { className: "w-4 h-4 rounded-full bg-red-500 animate-pulse" }), _jsx("span", { className: "text-xl font-medium text-red-700", children: "Reconnecting..." })] }));
}
