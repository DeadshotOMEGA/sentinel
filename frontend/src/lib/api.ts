import axios, { type InternalAxiosRequestConfig, type AxiosResponse } from 'axios';
import type { DdsAssignment } from '../hooks/useDds';

// Helper to get token from localStorage (avoids circular dependency with useAuth)
function getStoredToken(): string | null {
  try {
    const stored = localStorage.getItem('sentinel-auth');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.state?.token ?? null;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send cookies with requests
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Only trigger logout on 401 if not on auth endpoints (prevents loops)
    const url = error.config?.url ?? '';
    if (error.response?.status === 401 && !url.includes('/auth/')) {
      // Clear auth state directly to avoid circular dependency
      localStorage.removeItem('sentinel-auth');
      // Redirect to login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ============================================================================
// Dev Mode Network Logging
// ============================================================================

// Extended request config to track timing and request data
interface ExtendedRequestConfig extends InternalAxiosRequestConfig {
  __devStartTime?: number;
  __devRequestId?: string;
}

// Extended NetworkLogEntry with request headers
interface ExtendedNetworkLogEntry {
  id: string;
  timestamp: Date;
  method: string;
  url: string;
  status: number;
  duration: number;
  requestBody?: unknown;
  responseBody?: unknown;
  error?: string;
  requestHeaders?: Record<string, string>;
}

// URLs to exclude from logging to prevent infinite loops
const EXCLUDED_URL_PATTERNS = [
  '/dev-tools/', // Exclude dev tools API calls
];

function shouldLogRequest(url: string | undefined): boolean {
  if (!url) return false;
  return !EXCLUDED_URL_PATTERNS.some((pattern) => url.includes(pattern));
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function parseRequestBody(data: unknown): unknown {
  if (!data) return undefined;
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }
  return data;
}

function extractHeaders(headers: InternalAxiosRequestConfig['headers']): Record<string, string> {
  const result: Record<string, string> = {};
  if (!headers) return result;

  const headerObj = typeof headers.toJSON === 'function' ? headers.toJSON() : headers;
  for (const [key, value] of Object.entries(headerObj)) {
    if (typeof value === 'string') {
      result[key] = value;
    } else if (Array.isArray(value)) {
      result[key] = value.join(', ');
    }
  }
  return result;
}

// ============================================================================
// Error Injection Header Builder
// ============================================================================

/**
 * Build the X-Dev-Error-Inject header value from error injection config
 * Format: fail=0.3,delay=500,status=500,endpoints=/api/checkin,/api/members
 */
function buildErrorInjectionHeader(config: {
  failureRate: number;
  delayMs: number;
  statusCode: number;
  endpoints?: string[];
}): string {
  const parts: string[] = [];

  if (config.failureRate > 0) {
    parts.push(`fail=${config.failureRate}`);
  }

  if (config.delayMs > 0) {
    parts.push(`delay=${config.delayMs}`);
  }

  parts.push(`status=${config.statusCode}`);

  if (config.endpoints && config.endpoints.length > 0) {
    parts.push(`endpoints=${config.endpoints.join(',')}`);
  }

  return parts.join(',');
}

// ============================================================================
// Stale Checkins API Functions
// ============================================================================

import type { StaleCheckin } from '../../../shared/types';

export async function getStaleCheckins(hoursThreshold?: number): Promise<StaleCheckin[]> {
  const params = hoursThreshold ? `?hours=${hoursThreshold}` : '';
  const response = await api.get<{ staleCheckins: StaleCheckin[] }>(`/checkins/stale${params}`);
  return response.data.staleCheckins;
}

export async function resolveStaleCheckins(
  memberIds: string[],
  note: string
): Promise<{ resolved: number; errors?: Array<{ memberId: string; error: string }> }> {
  const response = await api.post<{ resolved: number; errors?: Array<{ memberId: string; error: string }> }>(
    '/checkins/stale/resolve',
    { memberIds, note }
  );
  return response.data;
}

// ============================================================================
// DDS API Functions
// ============================================================================

export async function getCurrentDds(): Promise<{ dds: DdsAssignment | null }> {
  const response = await api.get<{ dds: DdsAssignment | null }>('/dds/current');
  return response.data;
}

export async function assignDds(
  memberId: string,
  notes?: string
): Promise<{ dds: DdsAssignment }> {
  const response = await api.post<{ dds: DdsAssignment }>('/dds/assign', {
    memberId,
    notes,
  });
  return response.data;
}

export async function transferDds(
  toMemberId: string,
  notes?: string
): Promise<{ dds: DdsAssignment }> {
  const response = await api.post<{ dds: DdsAssignment }>('/dds/transfer', {
    toMemberId,
    notes,
  });
  return response.data;
}

export async function releaseDds(notes?: string): Promise<{ success: boolean }> {
  const response = await api.post<{ success: boolean }>('/dds/release', { notes });
  return response.data;
}

export async function transferLockup(
  toMemberId: string,
  notes?: string
): Promise<{ success: boolean }> {
  const response = await api.post<{ success: boolean }>('/tags/transfer-lockup', {
    toMemberId,
    notes,
  });
  return response.data;
}

export async function getLockupHolder(): Promise<{
  holder: { id: string; rank: string; firstName: string; lastName: string } | null;
}> {
  const response = await api.get<{
    holder: { id: string; rank: string; firstName: string; lastName: string } | null;
  }>('/tags/lockup-holder');
  return response.data;
}

// ============================================================================
// Dev Mode Network Logging - Interceptors
// ============================================================================

// Only add dev interceptors when in dev mode
if (typeof __DEV_MODE__ !== 'undefined' && __DEV_MODE__) {
  // Request interceptor for timing and error injection
  api.interceptors.request.use(async (config: ExtendedRequestConfig) => {
    if (shouldLogRequest(config.url)) {
      config.__devStartTime = performance.now();
      config.__devRequestId = generateRequestId();

      // Add error injection header if enabled
      const { useDevStore } = await import('../dev/store/dev-store');
      const { errorInjection } = useDevStore.getState();

      if (errorInjection.enabled) {
        const headerValue = buildErrorInjectionHeader({
          failureRate: errorInjection.failureRate,
          delayMs: errorInjection.delayMs,
          statusCode: errorInjection.statusCode,
          endpoints: errorInjection.endpoints,
        });
        config.headers.set('X-Dev-Error-Inject', headerValue);
      }
    }
    return config;
  });

  // Response interceptor for logging
  api.interceptors.response.use(
    async (response: AxiosResponse) => {
      const config = response.config as ExtendedRequestConfig;

      if (config.__devStartTime && config.__devRequestId && shouldLogRequest(config.url)) {
        const duration = Math.round(performance.now() - config.__devStartTime);

        // Dynamically import to avoid circular dependencies
        const { useDevStore } = await import('../dev/store/dev-store');

        const entry: ExtendedNetworkLogEntry = {
          id: config.__devRequestId,
          timestamp: new Date(),
          method: config.method?.toUpperCase() ?? 'UNKNOWN',
          url: config.url ?? '',
          status: response.status,
          duration,
          requestBody: parseRequestBody(config.data),
          responseBody: response.data,
          requestHeaders: extractHeaders(config.headers),
        };

        useDevStore.getState().addNetworkLog(entry);
      }

      return response;
    },
    async (error) => {
      const config = error.config as ExtendedRequestConfig | undefined;

      if (config?.__devStartTime && config.__devRequestId && shouldLogRequest(config.url)) {
        const duration = Math.round(performance.now() - config.__devStartTime);

        // Dynamically import to avoid circular dependencies
        const { useDevStore } = await import('../dev/store/dev-store');

        const entry: ExtendedNetworkLogEntry = {
          id: config.__devRequestId,
          timestamp: new Date(),
          method: config.method?.toUpperCase() ?? 'UNKNOWN',
          url: config.url ?? '',
          status: error.response?.status ?? 0,
          duration,
          requestBody: parseRequestBody(config.data),
          responseBody: error.response?.data,
          error: error.message,
          requestHeaders: extractHeaders(config.headers),
        };

        useDevStore.getState().addNetworkLog(entry);
      }

      return Promise.reject(error);
    }
  );
}
