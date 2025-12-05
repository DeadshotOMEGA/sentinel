/**
 * Simple toast notification utility
 * Uses browser alert for now - can be enhanced with a proper toast library later
 */

export const toast = {
  success: (message: string) => {
    console.log('[SUCCESS]', message);
    // TODO: Implement proper toast UI
    alert(message);
  },
  error: (message: string) => {
    console.error('[ERROR]', message);
    // TODO: Implement proper toast UI
    alert(`Error: ${message}`);
  },
  info: (message: string) => {
    console.info('[INFO]', message);
    // TODO: Implement proper toast UI
    alert(message);
  },
  warning: (message: string) => {
    console.warn('[WARNING]', message);
    // TODO: Implement proper toast UI
    alert(`Warning: ${message}`);
  },
};
