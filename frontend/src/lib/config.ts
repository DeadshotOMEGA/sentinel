/**
 * Frontend configuration loaded from environment variables.
 * All URLs are validated at startup to fail fast on misconfiguration.
 */

function getRequiredEnvVar(name: string): string {
  const value = import.meta.env[name];
  if (!value || typeof value !== 'string') {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}

function validateHttpUrl(url: string, name: string): string {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    throw new Error(`${name} must be a valid HTTP(S) URL, got: ${url}`);
  }
  return url;
}

function validateWsUrl(url: string, name: string): string {
  if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
    throw new Error(`${name} must be a valid WebSocket URL, got: ${url}`);
  }
  return url;
}

export interface AppConfig {
  apiUrl: string;
  wsUrl: string;
}

function loadConfig(): AppConfig {
  const apiUrl = getRequiredEnvVar('VITE_API_URL');
  const wsUrl = getRequiredEnvVar('VITE_WS_URL');

  return {
    apiUrl: validateHttpUrl(apiUrl, 'VITE_API_URL'),
    wsUrl: validateWsUrl(wsUrl, 'VITE_WS_URL'),
  };
}

export const config = loadConfig();
