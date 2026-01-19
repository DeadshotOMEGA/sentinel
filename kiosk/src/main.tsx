import React from 'react';
import ReactDOM from 'react-dom/client';
import { HeroUIProvider } from '@heroui/react';
import { ErrorBoundary } from '@sentinel/ui';
import App from './App';
import './styles/global.css';
import { initAudio } from './lib/audio';

// Initialize audio on app load
initAudio();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HeroUIProvider>
      <ErrorBoundary variant="kiosk">
        <main className="light text-foreground bg-background min-h-screen">
          <App />
        </main>
      </ErrorBoundary>
    </HeroUIProvider>
  </React.StrictMode>
);
