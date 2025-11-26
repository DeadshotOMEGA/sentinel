import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { usePresenceData } from '../hooks/usePresenceData';
import { Clock } from '../components/Clock';
import { PresenceCards } from '../components/PresenceCards';
import { DivisionStats } from '../components/DivisionStats';
import { ActivityFeed } from '../components/ActivityFeed';
import { ConnectionStatus } from '../components/ConnectionStatus';
export function PresenceView({ config }) {
    const { data, isConnected } = usePresenceData({ config });
    const connectionStatus = isConnected ? 'bg-emerald-500' : 'bg-red-500';
    const connectionText = isConnected ? 'Connected' : 'Disconnected';
    return (_jsxs("div", { className: "min-h-screen bg-gradient-to-br from-white to-gray-50 tv-mode", children: [_jsxs("div", { className: "flex h-screen", children: [_jsxs("div", { className: "flex-1 p-8 overflow-hidden", children: [_jsxs("div", { className: "flex justify-between items-start mb-8", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-5xl font-bold text-gray-900 mb-2", children: "HMCS Chippawa" }), _jsx("p", { className: "text-xl text-gray-600", children: "Personnel Presence Overview" }), _jsxs("div", { className: "mt-4 flex items-center gap-2", children: [_jsx("div", { className: `w-4 h-4 rounded-full ${connectionStatus}` }), _jsx("span", { className: "text-lg text-gray-700", children: connectionText })] })] }), _jsx(Clock, {})] }), _jsx("div", { className: "mb-8", children: _jsx(PresenceCards, { present: data.present, absent: data.absent, visitors: data.visitors }) }), _jsxs("div", { className: "mt-8", children: [_jsx("h2", { className: "text-3xl font-bold text-gray-900 mb-6", children: "Division Breakdown" }), _jsx(DivisionStats, { divisions: data.divisions })] })] }), config.activityFeedEnabled && (_jsx("div", { className: "w-[30%] border-l border-gray-200 bg-gray-50", children: _jsx(ActivityFeed, { config: config }) }))] }), _jsx(ConnectionStatus, { isConnected: isConnected })] }));
}
