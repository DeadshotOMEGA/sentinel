import React from 'react';
import ReactDOM from 'react-dom/client';
import { HeroUIProvider } from './components/ui/heroui-polyfills';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from '@sentinel/ui';
import App from './App';
import './styles/global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary variant="admin">
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <HeroUIProvider>
            <App />
          </HeroUIProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
