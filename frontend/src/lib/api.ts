import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import { config } from './config';

export const api = axios.create({
  baseURL: config.apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  // Send httpOnly cookies with requests (CORS credentials)
  withCredentials: true,
});

// Response interceptor for auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuth.getState().logout();
    }
    return Promise.reject(error);
  }
);
