/**
 * Frontend configuration loaded from environment variables.
 * Supports both absolute URLs (production) and relative paths (dev with Vite proxy).
 */

function getEnvVar(name: string, defaultValue = ''): string {
  const value = import.meta.env[name];
  if (!value || typeof value !== 'string') {
    return defaultValue;
  }
  return value;
}

export interface AppConfig {
  apiUrl: string;
  wsUrl: string;
}

function loadConfig(): AppConfig {
  // API URL: relative path like '/api' for Vite proxy, or full URL for production
  const apiUrl = getEnvVar('VITE_API_URL', '/api');

  // WebSocket URL: empty for same-origin (Vite proxy), or full URL for production
  // Empty string means use window.location to build the WebSocket URL
  const wsUrl = getEnvVar('VITE_WS_URL', '');

  return { apiUrl, wsUrl };
}

export const config = loadConfig();
