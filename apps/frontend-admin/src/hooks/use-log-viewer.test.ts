import { beforeEach, describe, expect, it, vi } from 'vitest'

const websocketManagerMock = vi.hoisted(() => ({
  connect: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  on: vi.fn(),
  emit: vi.fn(),
  off: vi.fn(),
  hasSocket: true,
  isSocketConnected: true,
}))

vi.mock('@/lib/websocket', () => ({
  websocketManager: websocketManagerMock,
}))

import {
  DEFAULT_LOG_FILTERS,
  DEFAULT_LOG_STREAM_LEVEL,
  useLogViewerStore,
  type LogEntry,
} from './use-log-viewer'

function createEntry(overrides: Partial<LogEntry>): LogEntry {
  return {
    id: overrides.id ?? 'entry-1',
    timestamp: overrides.timestamp ?? '2026-04-21T12:00:00.000Z',
    level: overrides.level ?? 'info',
    message: overrides.message ?? 'hello world',
    module: overrides.module,
    correlationId: overrides.correlationId,
    userId: overrides.userId,
    metadata: overrides.metadata,
    stack: overrides.stack,
  }
}

describe('useLogViewerStore', () => {
  beforeEach(() => {
    websocketManagerMock.connect.mockReset()
    websocketManagerMock.subscribe.mockReset()
    websocketManagerMock.unsubscribe.mockReset()
    websocketManagerMock.on.mockReset()
    websocketManagerMock.emit.mockReset()
    websocketManagerMock.off.mockReset()
    websocketManagerMock.hasSocket = true
    websocketManagerMock.isSocketConnected = true

    useLogViewerStore.setState({
      logs: [],
      filters: { ...DEFAULT_LOG_FILTERS },
      isConnected: false,
      isPaused: false,
      selectedLogId: null,
      bufferedEntries: [],
      streamLevel: DEFAULT_LOG_STREAM_LEVEL,
    })
  })

  it('buffers paused entries without mutating visible logs', () => {
    useLogViewerStore.getState().togglePause()
    useLogViewerStore.getState().addLog(
      createEntry({
        id: 'paused-1',
        message: 'buffer me',
      })
    )

    expect(useLogViewerStore.getState().logs).toEqual([])
    expect(useLogViewerStore.getState().bufferedEntries).toEqual([
      expect.objectContaining({ id: 'paused-1', message: 'buffer me' }),
    ])
  })

  it('flushes buffered entries newest-first when resuming', () => {
    useLogViewerStore.setState({
      logs: [
        createEntry({ id: 'existing-1', timestamp: '2026-04-21T11:59:00.000Z' }),
        createEntry({ id: 'existing-2', timestamp: '2026-04-21T11:58:00.000Z' }),
      ],
    })

    useLogViewerStore.getState().togglePause()
    useLogViewerStore
      .getState()
      .addLog(createEntry({ id: 'paused-1', timestamp: '2026-04-21T12:01:00.000Z' }))
    useLogViewerStore
      .getState()
      .addLog(createEntry({ id: 'paused-2', timestamp: '2026-04-21T12:02:00.000Z' }))
    useLogViewerStore.getState().togglePause()

    expect(useLogViewerStore.getState().isPaused).toBe(false)
    expect(useLogViewerStore.getState().bufferedEntries).toEqual([])
    expect(useLogViewerStore.getState().logs.map((entry) => entry.id)).toEqual([
      'paused-2',
      'paused-1',
      'existing-1',
      'existing-2',
    ])
  })

  it('requests a history refresh after changing stream level', () => {
    useLogViewerStore.getState().setStreamLevel('debug')

    expect(useLogViewerStore.getState().streamLevel).toBe('debug')
    expect(websocketManagerMock.emit).toHaveBeenNthCalledWith(1, 'logs:set-level', 'debug')
    expect(websocketManagerMock.emit).toHaveBeenNthCalledWith(2, 'logs:subscribe')
  })

  it('clears local state and backend history when clearing logs', () => {
    useLogViewerStore.setState({
      logs: [createEntry({ id: 'visible-1' })],
      bufferedEntries: [createEntry({ id: 'buffered-1' })],
      selectedLogId: 'visible-1',
    })

    useLogViewerStore.getState().clearLogs()

    expect(websocketManagerMock.emit).toHaveBeenCalledWith('logs:clear-history')
    expect(useLogViewerStore.getState().logs).toEqual([])
    expect(useLogViewerStore.getState().bufferedEntries).toEqual([])
    expect(useLogViewerStore.getState().selectedLogId).toBeNull()
  })
})
