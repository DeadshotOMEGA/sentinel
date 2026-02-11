import { QueryCache, QueryClient, MutationCache } from '@tanstack/react-query'
import { toast } from 'sonner'

function handle401() {
  // Clear persisted auth state
  localStorage.removeItem('auth-storage')
  toast.error('Session expired. Please log in again.')
  window.location.href = '/login'
}

function isHttpError(error: unknown, status: number): boolean {
  if (error && typeof error === 'object' && 'status' in error) {
    return (error as { status: number }).status === status
  }
  return false
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (isHttpError(error, 401)) {
        // Only toast on background refetches (data already cached)
        if (query.state.data !== undefined) {
          handle401()
        } else {
          // Initial load 401 — just redirect silently
          window.location.href = '/login'
        }
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      if (isHttpError(error, 401)) {
        handle401()
      }
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: (failureCount, error) => {
        if (isHttpError(error, 401)) return false
        return failureCount < 1
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})
