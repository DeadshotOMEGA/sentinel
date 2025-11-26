import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { loadConfig } from './lib/config';
import { PresenceView } from './pages/PresenceView';
import { EventView } from './pages/EventView';
export default function App() {
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        const initializeConfig = async () => {
            try {
                const loadedConfig = await loadConfig();
                setConfig(loadedConfig);
            }
            catch (err) {
                if (err instanceof Error) {
                    setError(err.message);
                }
                else {
                    setError('Unknown error while loading configuration');
                }
            }
            finally {
                setLoading(false);
            }
        };
        initializeConfig();
    }, []);
    if (loading) {
        return (_jsx("div", { className: "tv-mode flex items-center justify-center", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-4xl font-bold mb-4", children: "Loading Configuration" }), _jsx("div", { className: "text-2xl text-gray-600", children: "Initializing TV Display..." })] }) }));
    }
    if (error) {
        return (_jsx("div", { className: "tv-mode flex items-center justify-center bg-red-50", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-4xl font-bold mb-4 text-red-700", children: "Configuration Error" }), _jsx("div", { className: "text-2xl text-red-600", children: error })] }) }));
    }
    if (!config) {
        return (_jsx("div", { className: "tv-mode flex items-center justify-center", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-4xl font-bold mb-4", children: "No Configuration" }), _jsx("div", { className: "text-2xl text-gray-600", children: "Unable to load display configuration" })] }) }));
    }
    if (config.displayMode === 'event-only' && config.eventId) {
        if (!config.eventName) {
            return (_jsx("div", { className: "tv-mode flex items-center justify-center bg-red-50", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-4xl font-bold mb-4 text-red-700", children: "Configuration Error" }), _jsx("div", { className: "text-2xl text-red-600", children: "eventName is required for event-only mode" })] }) }));
        }
        return _jsx(EventView, { config: config, eventName: config.eventName });
    }
    return _jsx(PresenceView, { config: config });
}
