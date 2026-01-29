import Transport from 'winston-transport'
import type { Server as SocketIOServer } from 'socket.io'

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

const BUFFER_SIZE = 500

/**
 * Custom Winston transport that streams log entries to Socket.IO clients.
 *
 * Buffers entries in a ring buffer (last 500) for initial page load history.
 * Emits `log:entry` events to all clients in the `logs` room.
 * The Socket.IO server reference is set lazily via `setIO()` after server init.
 */
export class SocketIOTransport extends Transport {
  private io: SocketIOServer | null = null
  private buffer: LogEntry[] = []

  constructor(opts?: Transport.TransportStreamOptions) {
    super(opts)
  }

  log(info: Record<string, unknown>, callback: () => void): void {
    setImmediate(() => this.emit('logged', info))

    const entry: LogEntry = {
      id: info.id as string || '',
      timestamp: info.timestamp as string || new Date().toISOString(),
      level: info.level as string,
      message: info.message as string,
      module: info.module as string | undefined,
      correlationId: info.correlationId as string | undefined,
      userId: info.userId as string | undefined,
      stack: info.stack as string | undefined,
      metadata: this.extractMetadata(info),
    }

    // Ring buffer: push and trim
    this.buffer.push(entry)
    if (this.buffer.length > BUFFER_SIZE) {
      this.buffer = this.buffer.slice(-BUFFER_SIZE)
    }

    // Emit to connected clients in the 'logs' room
    if (this.io) {
      this.io.to('logs').emit('log:entry', entry)
    }

    callback()
  }

  setIO(io: SocketIOServer): void {
    this.io = io
  }

  getHistory(): LogEntry[] {
    return [...this.buffer]
  }

  clearHistory(): void {
    this.buffer = []
  }

  private extractMetadata(info: Record<string, unknown>): Record<string, unknown> | undefined {
    const reserved = new Set([
      'id', 'timestamp', 'level', 'message', 'module',
      'correlationId', 'userId', 'stack', 'service', 'environment',
      'apiKeyId', Symbol.for('level'), Symbol.for('splat'),
    ])

    const metadata: Record<string, unknown> = {}
    let hasKeys = false

    for (const key of Object.keys(info)) {
      if (!reserved.has(key)) {
        metadata[key] = info[key]
        hasKeys = true
      }
    }

    return hasKeys ? metadata : undefined
  }
}

/** Singleton transport instance */
export const socketIOTransport = new SocketIOTransport({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
})
