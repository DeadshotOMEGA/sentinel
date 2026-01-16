/**
 * Log Formatting Utilities
 *
 * Framework-agnostic utilities for formatting log entries.
 * Used by LogViewer component for consistent log display.
 */
/**
 * Get the HeroUI color for a log level.
 * @param level - Log level string
 * @returns HeroUI color name
 */
export function getLogLevelColor(level) {
    switch (level) {
        case 'error':
            return 'danger';
        case 'warn':
            return 'warning';
        case 'info':
            return 'primary';
        default:
            return 'default';
    }
}
/**
 * Format a timestamp string for display in log viewer.
 * Shows HH:MM:SS.mmm format in 24-hour time.
 * @param ts - ISO timestamp string
 * @returns Formatted time string
 */
export function formatLogTime(ts) {
    try {
        const date = new Date(ts);
        return date.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            fractionalSecondDigits: 3,
        });
    }
    catch {
        return ts;
    }
}
/**
 * Truncate an ID string for display.
 * @param id - ID string to truncate
 * @param length - Maximum length before truncation (default: 8)
 * @returns Truncated ID with ellipsis or dash if empty
 */
export function truncateId(id, length = 8) {
    if (!id)
        return '-';
    return id.length > length ? `${id.slice(0, length)}...` : id;
}
/**
 * Truncate a message for display in a table cell.
 * @param msg - Message to truncate
 * @param maxLength - Maximum length before truncation (default: 80)
 * @returns Truncated message with ellipsis if needed
 */
export function truncateMessage(msg, maxLength = 80) {
    if (msg.length <= maxLength)
        return msg;
    return `${msg.slice(0, maxLength)}...`;
}
/**
 * Get the display label for a log level.
 * @param level - Log level
 * @returns Uppercase level label
 */
export function getLogLevelLabel(level) {
    return level.toUpperCase();
}
