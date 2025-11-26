async function fetchConfigFile() {
    const response = await fetch('/tv-config.json');
    if (!response.ok) {
        throw new Error(`Failed to fetch tv-config.json: ${response.statusText}`);
    }
    const data = await response.json();
    return validateConfig(data);
}
function validateConfig(data) {
    if (typeof data !== 'object' || data === null) {
        throw new Error('Configuration must be an object');
    }
    const config = data;
    if (typeof config.displayMode !== 'string') {
        throw new Error('displayMode must be a string');
    }
    if (!['unit-overview', 'division-split', 'combined', 'event-only'].includes(config.displayMode)) {
        throw new Error('displayMode must be one of: unit-overview, division-split, combined, event-only');
    }
    if (typeof config.refreshInterval !== 'number') {
        throw new Error('refreshInterval must be a number');
    }
    if (config.refreshInterval < 100) {
        throw new Error('refreshInterval must be at least 100ms');
    }
    if (typeof config.activityFeedEnabled !== 'boolean') {
        throw new Error('activityFeedEnabled must be a boolean');
    }
    if (config.eventId !== null && typeof config.eventId !== 'string') {
        throw new Error('eventId must be null or a string');
    }
    if (config.eventName !== null && typeof config.eventName !== 'string') {
        throw new Error('eventName must be null or a string');
    }
    if (typeof config.apiUrl !== 'string') {
        throw new Error('apiUrl must be a string');
    }
    if (!config.apiUrl.startsWith('http://') && !config.apiUrl.startsWith('https://')) {
        throw new Error('apiUrl must be a valid HTTP(S) URL');
    }
    if (typeof config.wsUrl !== 'string') {
        throw new Error('wsUrl must be a string');
    }
    if (!config.wsUrl.startsWith('ws://') && !config.wsUrl.startsWith('wss://')) {
        throw new Error('wsUrl must be a valid WebSocket URL');
    }
    return {
        displayMode: config.displayMode,
        refreshInterval: config.refreshInterval,
        activityFeedEnabled: config.activityFeedEnabled,
        eventId: config.eventId,
        eventName: config.eventName,
        apiUrl: config.apiUrl,
        wsUrl: config.wsUrl,
    };
}
export async function loadConfig() {
    try {
        return await fetchConfigFile();
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error loading configuration';
        throw new Error(`Configuration load error: ${message}`);
    }
}
