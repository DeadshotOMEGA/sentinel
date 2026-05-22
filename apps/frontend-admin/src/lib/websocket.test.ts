import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Socket } from 'socket.io-client'
import { io } from 'socket.io-client'
import { WebSocketManager } from './websocket'

interface MockSocket {
  connected: boolean
  connect: ReturnType<typeof vi.fn>
  disconnect: ReturnType<typeof vi.fn>
  emit: ReturnType<typeof vi.fn>
  on: ReturnType<typeof vi.fn>
  off: ReturnType<typeof vi.fn>
}

const handlers = new Map<string, Array<(payload?: unknown) => void>>()

function createMockSocket(): MockSocket {
  return {
    connected: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
    emit: vi.fn(),
    on: vi.fn((event: string, handler: (payload?: unknown) => void) => {
      const registeredHandlers = handlers.get(event) ?? []
      registeredHandlers.push(handler)
      handlers.set(event, registeredHandlers)
    }),
    off: vi.fn(),
  }
}

function emitSocketEvent(event: string, payload?: unknown) {
  for (const handler of handlers.get(event) ?? []) {
    handler(payload)
  }
}

vi.mock('socket.io-client', () => ({
  io: vi.fn(),
}))

describe('WebSocketManager', () => {
  let socket: MockSocket

  beforeEach(() => {
    handlers.clear()
    socket = createMockSocket()
    vi.mocked(io).mockReturnValue(socket as unknown as Socket)
  })

  it('keeps one room subscription until every caller has unsubscribed', () => {
    const manager = new WebSocketManager()
    manager.connect()

    manager.subscribe('presence')
    manager.subscribe('presence')
    manager.unsubscribe('presence')

    expect(socket.emit).toHaveBeenCalledTimes(1)
    expect(socket.emit).toHaveBeenNthCalledWith(1, 'presence:subscribe')

    manager.unsubscribe('presence')

    expect(socket.emit).toHaveBeenCalledTimes(2)
    expect(socket.emit).toHaveBeenNthCalledWith(2, 'presence:unsubscribe')
  })

  it('resubscribes active rooms after Socket.IO reconnects', () => {
    const manager = new WebSocketManager()
    manager.connect()
    manager.subscribe('checkins')
    manager.subscribe('presence')

    socket.emit.mockClear()

    emitSocketEvent('connect')

    expect(socket.emit).toHaveBeenCalledWith('checkins:subscribe')
    expect(socket.emit).toHaveBeenCalledWith('presence:subscribe')
  })

  it('reconnects an existing disconnected socket when a hook asks to connect again', () => {
    const manager = new WebSocketManager()
    manager.connect()

    manager.connect()

    expect(socket.connect).toHaveBeenCalledTimes(1)
  })
})
