import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api';

interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'coxswain' | 'readonly';
  email: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: true,
      
      login: async (username: string, password: string) => {
        const response = await api.post<{ token: string; user: User }>('/auth/login', {
          username,
          password,
        });
        set({
          token: response.data.token,
          user: response.data.user,
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
        set({ token: null, user: null, isAuthenticated: false });
      },
      
      checkAuth: async () => {
        const { token } = get();
        if (!token) {
          set({ isAuthenticated: false, isLoading: false });
          return;
        }
        try {
          const response = await api.get<{ user: User }>('/auth/me');
          set({ user: response.data.user, isAuthenticated: true, isLoading: false });
        } catch {
          set({ token: null, user: null, isAuthenticated: false, isLoading: false });
        }
      },
    }),
    {
      name: 'sentinel-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
      onRehydrateStorage: () => (state) => {
        state?.checkAuth();
      },
    }
  )
);
