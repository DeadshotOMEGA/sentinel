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

export const LOG_STREAM_LEVELS = [
  'error',
  'warn',
  'info',
  'http',
  'verbose',
  'debug',
  'silly',
] as const

export type LogStreamLevel = (typeof LOG_STREAM_LEVELS)[number]

export const DEFAULT_LOG_FILTERS: LogFilters = {
  levels: [],
  modules: [],
  search: '',
  correlationId: '',
}

export const DEFAULT_LOG_STREAM_LEVEL: LogStreamLevel = 'info'

const LOG_LEVEL_VALUE: Record<LogStreamLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
}

interface LogViewerState {
  logs: LogEntry[]
  filters: LogFilters
  isConnected: boolean
  isPaused: boolean
  selectedLogId: string | null
  bufferedEntries: LogEntry[]
  streamLevel: LogStreamLevel

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
  setStreamLevel: (level: LogStreamLevel) => void
}

const MAX_LOGS = 2000

export const useLogViewerStore = create<LogViewerState>((set) => ({
  logs: [],
  filters: { ...DEFAULT_LOG_FILTERS },
  isConnected: false,
  isPaused: false,
  selectedLogId: null,
  bufferedEntries: [],
  streamLevel: DEFAULT_LOG_STREAM_LEVEL,

  subscribe: () => {
    websocketManager.connect()
    set({ isConnected: websocketManager.isSocketConnected })
    websocketManager.subscribe('logs')
    websocketManager.on('log:history', handleHistory)
    websocketManager.on('log:entry', handleEntry)
    websocketManager.on('connect', handleConnect)
    websocketManager.on('disconnect', handleDisconnect)
  },

  unsubscribe: () => {
    set({ isConnected: false })
    if (websocketManager.hasSocket) {
      websocketManager.unsubscribe('logs')
      websocketManager.off('log:history', handleHistory)
      websocketManager.off('log:entry', handleEntry)
      websocketManager.off('connect', handleConnect)
      websocketManager.off('disconnect', handleDisconnect)
    }
  },

  clearLogs: () => {
    if (websocketManager.hasSocket) {
      websocketManager.emit('logs:clear-history')
    }

    set({ logs: [], bufferedEntries: [], selectedLogId: null })
  },

  setFilter: (partial: Partial<LogFilters>) => {
    set((state) => ({
      filters: { ...state.filters, ...partial },
    }))
  },

  togglePause: () => {
    set((state) => {
      if (!state.isPaused) {
        return { isPaused: true }
      }

      return {
        isPaused: false,
        logs: trimLogs([...state.bufferedEntries, ...state.logs]),
        bufferedEntries: [],
      }
    })
  },

  setSelectedLogId: (id: string | null) => {
    set({ selectedLogId: id })
  },

  addLog: (entry: LogEntry) => {
    set((state) => {
      if (state.isPaused) {
        return {
          bufferedEntries: trimLogs([entry, ...state.bufferedEntries]),
        }
      }

      return { logs: trimLogs([entry, ...state.logs]) }
    })
  },

  setHistory: (logs: LogEntry[]) => {
    set((state) => {
      const sorted = trimLogs(sortLogs(logs))

      return {
        logs: sorted,
        streamLevel: inferStreamLevel(sorted, state.streamLevel),
      }
    })
  },

  setConnected: (connected: boolean) => {
    set({ isConnected: connected })
  },

  setStreamLevel: (level: LogStreamLevel) => {
    set((state) => ({
      streamLevel: level,
      bufferedEntries: filterEntriesByStreamLevel(state.bufferedEntries, level),
    }))

    if (websocketManager.hasSocket) {
      websocketManager.emit('logs:set-level', level)
      websocketManager.emit('logs:subscribe')
    }
  },
}))

function sortLogs(logs: LogEntry[]): LogEntry[] {
  return [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

function trimLogs(logs: LogEntry[]): LogEntry[] {
  return logs.slice(0, MAX_LOGS)
}

function getLevelValue(level: string): number {
  return LOG_LEVEL_VALUE[level as LogStreamLevel] ?? LOG_LEVEL_VALUE.info
}

function filterEntriesByStreamLevel(logs: LogEntry[], level: LogStreamLevel): LogEntry[] {
  const threshold = LOG_LEVEL_VALUE[level]
  return trimLogs(logs.filter((entry) => getLevelValue(entry.level) <= threshold))
}

function inferStreamLevel(logs: LogEntry[], fallback: LogStreamLevel): LogStreamLevel {
  return logs.reduce<LogStreamLevel>((current, entry) => {
    const nextLevel = entry.level as LogStreamLevel
    if (!LOG_STREAM_LEVELS.includes(nextLevel)) {
      return current
    }

    return LOG_LEVEL_VALUE[nextLevel] > LOG_LEVEL_VALUE[current] ? nextLevel : current
  }, fallback)
}

function handleHistory(data: unknown) {
  if (Array.isArray(data)) {
    useLogViewerStore.getState().setHistory(data as LogEntry[])
  }
}

function handleEntry(data: unknown) {
  if (data && typeof data === 'object' && 'id' in data) {
    useLogViewerStore.getState().addLog(data as LogEntry)
  }
}

function handleConnect() {
  useLogViewerStore.getState().setConnected(true)
}

function handleDisconnect() {
  useLogViewerStore.getState().setConnected(false)
}

export function useLogViewer(enabled = true) {
  const subscribe = useLogViewerStore((s) => s.subscribe)
  const unsubscribe = useLogViewerStore((s) => s.unsubscribe)

  useEffect(() => {
    if (!enabled) {
      return
    }

    subscribe()
    return () => {
      unsubscribe()
    }
  }, [enabled, subscribe, unsubscribe])
}

export function useFilteredLogs(): LogEntry[] {
  const { logs, filters } = useLogViewerStore()

  return useMemo(() => {
    const filtered = logs.filter((log) => {
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
        const metadataMatch = log.metadata
          ? JSON.stringify(log.metadata).toLowerCase().includes(searchLower)
          : false
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

    // Sort by timestamp descending (newest first)
    return filtered.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
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
