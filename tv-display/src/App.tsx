import { useEffect, useState } from 'react'
import { loadConfig } from './lib/config'
import type { TVConfig } from './lib/config'
import { PresenceView } from './pages/PresenceView'
import { EventView } from './pages/EventView'

export default function App(): React.ReactNode {
  const [config, setConfig] = useState<TVConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      <div className="tv-mode flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl font-bold mb-4">Loading Configuration</div>
          <div className="text-2xl text-gray-600">Initializing TV Display...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="tv-mode flex items-center justify-center bg-red-50">
        <div className="text-center">
          <div className="text-4xl font-bold mb-4 text-red-700">Configuration Error</div>
          <div className="text-2xl text-red-600">{error}</div>
        </div>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="tv-mode flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl font-bold mb-4">No Configuration</div>
          <div className="text-2xl text-gray-600">Unable to load display configuration</div>
        </div>
      </div>
    )
  }

  if (config.displayMode === 'event-only' && config.eventId) {
    if (!config.eventName) {
      return (
        <div className="tv-mode flex items-center justify-center bg-red-50">
          <div className="text-center">
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
