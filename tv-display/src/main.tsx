import React from 'react'
import ReactDOM from 'react-dom/client'
import { HeroUIProvider } from '@heroui/react'
import { ErrorBoundary } from '@sentinel/ui'
import App from './App'
import './index.css'

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(
  <React.StrictMode>
    <HeroUIProvider>
      <ErrorBoundary variant="tv">
        <main className="light text-foreground bg-background min-h-screen">
          <App />
        </main>
      </ErrorBoundary>
    </HeroUIProvider>
  </React.StrictMode>,
)
