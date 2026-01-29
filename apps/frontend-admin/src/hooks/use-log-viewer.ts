'use client'

import { create } from 'zustand'
import { useEffect, useMemo } from 'react'
import { websocketManager } from '@/lib/websocket'

export interface LogEntry {
  id: string
  timestamp: string
  level: string
  message: string
  module?: string
  correlationId?: string
  userId?: string
  metadata?: Record<string, unknown>
  stack?: string
}

export interface LogFilters {
  levels: string[]
  modules: string[]
  search: string
  correlationId: string
}

interface LogViewerState {
  logs: LogEntry[]
  filters: LogFilters
  isConnected: boolean
  isPaused: boolean
  selectedLogId: string | null
  bufferedEntries: LogEntry[]

  // Actions
  subscribe: () => void
  unsubscribe: () => void
  clearLogs: () => void
  setFilter: (partial: Partial<LogFilters>) => void
  togglePause: () => void
  setSelectedLogId: (id: string | null) => void
  addLog: (entry: LogEntry) => void
  setHistory: (logs: LogEntry[]) => void
  setConnected: (connected: boolean) => void
}

const MAX_LOGS = 2000

export const useLogViewerStore = create<LogViewerState>((set, get) => ({
  logs: [],
  filters: {
    levels: [],
    modules: [],
    search: '',
    correlationId: '',
  },
  isConnected: false,
  isPaused: false,
  selectedLogId: null,
  bufferedEntries: [],

  subscribe: () => {
    set({ isConnected: true })
    websocketManager.connect()
    websocketManager.subscribe('logs')

    const handleHistory = (data: unknown) => {
      if (Array.isArray(data)) {
        get().setHistory(data as LogEntry[])
      }
    }

    const handleEntry = (data: unknown) => {
      if (data && typeof data === 'object' && 'id' in data) {
        get().addLog(data as LogEntry)
      }
    }

    websocketManager.on('log:history', handleHistory)
    websocketManager.on('log:entry', handleEntry)
  },

  unsubscribe: () => {
    set({ isConnected: false })
    websocketManager.unsubscribe('logs')
    websocketManager.off('log:history')
    websocketManager.off('log:entry')
  },

  clearLogs: () => {
    set({ logs: [], bufferedEntries: [] })
  },

  setFilter: (partial: Partial<LogFilters>) => {
    set((state) => ({
      filters: { ...state.filters, ...partial },
    }))
  },

  togglePause: () => {
    set((state) => ({ isPaused: !state.isPaused }))
  },

  setSelectedLogId: (id: string | null) => {
    set({ selectedLogId: id })
  },

  addLog: (entry: LogEntry) => {
    set((state) => {
      const newLogs = [entry, ...state.logs]
      if (newLogs.length > MAX_LOGS) {
        newLogs.length = MAX_LOGS
      }

      if (state.isPaused) {
        return {
          logs: newLogs,
          bufferedEntries: [entry, ...state.bufferedEntries],
        }
      }

      return { logs: newLogs }
    })
  },

  setHistory: (logs: LogEntry[]) => {
    set({ logs: logs.slice(0, MAX_LOGS) })
  },

  setConnected: (connected: boolean) => {
    set({ isConnected: connected })
  },
}))

export function useLogViewer() {
  const subscribe = useLogViewerStore((s) => s.subscribe)
  const unsubscribe = useLogViewerStore((s) => s.unsubscribe)

  useEffect(() => {
    subscribe()
    return () => {
      unsubscribe()
    }
  }, [subscribe, unsubscribe])
}

export function useFilteredLogs(): LogEntry[] {
  const { logs, filters } = useLogViewerStore()

  return useMemo(() => {
    return logs.filter((log) => {
      // Filter by levels
      if (filters.levels.length > 0 && !filters.levels.includes(log.level)) {
        return false
      }

      // Filter by modules
      if (filters.modules.length > 0 && (!log.module || !filters.modules.includes(log.module))) {
        return false
      }

      // Filter by search term
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        const messageMatch = log.message.toLowerCase().includes(searchLower)
        const metadataMatch = log.metadata ? JSON.stringify(log.metadata).toLowerCase().includes(searchLower) : false
        if (!messageMatch && !metadataMatch) {
          return false
        }
      }

      // Filter by correlation ID
      if (filters.correlationId && log.correlationId !== filters.correlationId) {
        return false
      }

      return true
    })
  }, [logs, filters])
}

export function useLogStats() {
  const { logs } = useLogViewerStore()

  return useMemo(() => {
    const total = logs.length
    const errors = logs.filter((log) => log.level === 'error').length
    const warnings = logs.filter((log) => log.level === 'warn').length
    const infos = logs.filter((log) => log.level === 'info').length

    // Calculate rate over rolling 10s window
    const now = Date.now()
    const tenSecondsAgo = now - 10000
    const recentLogs = logs.filter((log) => {
      const logTime = new Date(log.timestamp).getTime()
      return logTime > tenSecondsAgo
    })
    const rate = recentLogs.length > 0 ? (recentLogs.length / 10).toFixed(1) : '0.0'

    return {
      total,
      errors,
      warnings,
      infos,
      rate: parseFloat(rate),
    }
  }, [logs])
}
