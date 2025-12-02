import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, setAuthToken, clearAuthToken } from '../lib/api';

interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'coxswain' | 'readonly';
  email: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, _get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,

      login: async (username: string, password: string) => {
        const response = await api.post<{ user: User; token?: string }>('/auth/login', {
          username,
          password,
        });
        const token = response.data.token ?? null;
        // Store token for Bearer auth (dev mode)
        if (token) {
          setAuthToken(token);
        }
        set({
          user: response.data.user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch {
          // Ignore logout errors
        }
        clearAuthToken();
        set({ user: null, token: null, isAuthenticated: false });
      },

      checkAuth: async () => {
        try {
          const response = await api.get<{ user: User }>('/auth/me');
          set({ user: response.data.user, isAuthenticated: true, isLoading: false });
        } catch {
          clearAuthToken();
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
        }
      },
    }),
    {
      name: 'sentinel-auth',
      partialize: (state) => ({ user: state.user, token: state.token }),
      onRehydrateStorage: () => (state) => {
        // Restore token to api.ts before checking auth
        if (state?.token) {
          setAuthToken(state.token);
        }
        state?.checkAuth();
      },
    }
  )
);
