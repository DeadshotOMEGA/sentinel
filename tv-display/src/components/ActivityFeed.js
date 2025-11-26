import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useActivityFeed } from '../hooks/useActivityFeed';
function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-CA', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
}
function getActivityStyles(type) {
    switch (type) {
        case 'checkin':
            return {
                border: 'border-l-emerald-500',
                bg: 'bg-emerald-50',
                label: 'IN',
            };
        case 'checkout':
            return {
                border: 'border-l-orange-500',
                bg: 'bg-orange-50',
                label: 'OUT',
            };
        case 'visitor':
            return {
                border: 'border-l-blue-500',
                bg: 'bg-blue-50',
                label: 'VISITOR',
            };
    }
}
export function ActivityFeed({ config }) {
    const { activities } = useActivityFeed(config);
    return (_jsxs("div", { className: "h-full flex flex-col p-6", children: [_jsx("h2", { className: "text-3xl font-bold text-gray-900 mb-6", children: "Recent Activity" }), _jsx("div", { className: "flex-1 overflow-hidden", children: activities.length === 0 ? (_jsx("div", { className: "flex items-center justify-center h-full", children: _jsx("p", { className: "text-2xl text-gray-400", children: "Waiting for activity..." }) })) : (_jsx("div", { className: "space-y-4", children: activities.map((activity, index) => {
                        const styles = getActivityStyles(activity.type);
                        return (_jsxs("div", { className: `border-l-4 ${styles.border} ${styles.bg} p-4 rounded-r-lg animate-fade-in`, style: { animationDelay: `${index * 50}ms` }, children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("span", { className: "text-2xl font-mono text-gray-700", children: formatTime(activity.timestamp) }), _jsx("span", { className: "text-lg font-semibold text-gray-600", children: styles.label })] }), _jsxs("div", { className: "text-2xl font-semibold text-gray-900", children: [activity.rank ? `${activity.rank} ` : '', activity.name] }), activity.division && (_jsx("div", { className: "text-xl text-gray-600 mt-1", children: activity.division }))] }, activity.id));
                    }) })) })] }));
}
