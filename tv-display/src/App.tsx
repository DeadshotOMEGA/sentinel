import { useEffect, useState } from 'react'
import { loadConfig } from './lib/config'
import type { TVConfig } from './lib/config'
import { PresenceView } from './pages/PresenceView'
import { EventView } from './pages/EventView'
import { AdaptiveModeTest } from './components/AdaptiveModeTest'

export default function App(): React.ReactNode {
  const [config, setConfig] = useState<TVConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check if test mode is enabled via URL param
  const searchParams = new URLSearchParams(window.location.search)
  const testParam = searchParams.get('test')
  const isTestMode = testParam === 'adaptive'

  // Test mode for development/testing only
  if (isTestMode) {
    return <AdaptiveModeTest />
  }

  useEffect(() => {
    const initializeConfig = async (): Promise<void> => {
      try {
        const loadedConfig = await loadConfig()
        setConfig(loadedConfig)
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message)
        } else {
          setError('Unknown error while loading configuration')
        }
      } finally {
        setLoading(false)
      }
    }

    initializeConfig()
  }, [])

  if (loading) {
    return (
      <div className="tv-mode flex items-center justify-center" role="main">
        <div className="text-center" role="status" aria-live="polite">
          <div className="text-4xl font-bold mb-4">Loading Configuration</div>
          <div className="text-2xl text-gray-600">Initializing TV Display...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="tv-mode flex items-center justify-center bg-red-50" role="main">
        <div className="text-center" role="alert" aria-live="assertive">
          <div className="text-4xl font-bold mb-4 text-red-700">Configuration Error</div>
          <div className="text-2xl text-red-600">{error}</div>
        </div>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="tv-mode flex items-center justify-center" role="main">
        <div className="text-center" role="alert" aria-live="assertive">
          <div className="text-4xl font-bold mb-4">No Configuration</div>
          <div className="text-2xl text-gray-600">Unable to load display configuration</div>
        </div>
      </div>
    )
  }

  if (config.displayMode === 'event-only' && config.eventId) {
    if (!config.eventName) {
      return (
        <div className="tv-mode flex items-center justify-center bg-red-50" role="main">
          <div className="text-center" role="alert" aria-live="assertive">
            <div className="text-4xl font-bold mb-4 text-red-700">Configuration Error</div>
            <div className="text-2xl text-red-600">eventName is required for event-only mode</div>
          </div>
        </div>
      )
    }
    return <EventView config={config} eventName={config.eventName} />
  }

  return <PresenceView config={config} />
}
