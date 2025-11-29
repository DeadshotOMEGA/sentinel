import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from '@sentinel/ui';
import App from './App';
import './styles/global.css';
import { initAudio } from './lib/audio';

// Initialize audio on app load
initAudio();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary variant="kiosk">
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
