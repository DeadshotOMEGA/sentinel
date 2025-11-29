import React from 'react'
import ReactDOM from 'react-dom/client'
import { ErrorBoundary } from '@sentinel/ui'
import App from './App'
import './index.css'

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(
  <React.StrictMode>
    <ErrorBoundary variant="tv">
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
