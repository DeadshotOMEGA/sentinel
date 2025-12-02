import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import { config } from './config';

// Token storage for Bearer auth (dev mode)
let authToken: string | null = null;

export function setAuthToken(token: string): void {
  authToken = token;
}

export function clearAuthToken(): void {
  authToken = null;
}

export const api = axios.create({
  baseURL: config.apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  // Send httpOnly cookies with requests (CORS credentials)
  withCredentials: true,
});

// Request interceptor to add Bearer token (dev mode)
api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

// Response interceptor for auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't trigger logout for auth endpoints (prevents infinite loop)
    const isAuthEndpoint = error.config?.url?.includes('/auth/');
    if (error.response?.status === 401 && !isAuthEndpoint) {
      useAuth.getState().logout();
    }
    return Promise.reject(error);
  }
);
