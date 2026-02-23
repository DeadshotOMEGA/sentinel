/* global process */
import { io, Socket } from 'socket.io-client'

class WebSocketManager {
  private socket: Socket | null = null

  connect() {
    if (this.socket) return

    const socketUrl = process.env.NEXT_PUBLIC_WS_URL || undefined
    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    })

    this.socket.on('connect', () => {
      console.log('[WebSocket] Connected:', this.socket?.id)
    })

    this.socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason)
    })

    this.socket.on('error', (error) => {
      console.error('[WebSocket] Error:', error)
    })
  }

  subscribe(channel: string) {
    if (!this.socket) throw new Error('Socket not initialized')
    this.socket.emit(`${channel}:subscribe`)
  }

  unsubscribe(channel: string) {
    if (!this.socket) throw new Error('Socket not initialized')
    this.socket.emit(`${channel}:unsubscribe`)
  }

  on(event: string, handler: (data: unknown) => void) {
    if (!this.socket) throw new Error('Socket not initialized')
    this.socket.on(event, handler)
  }

  emit(event: string, ...args: unknown[]) {
    if (!this.socket) throw new Error('Socket not initialized')
    this.socket.emit(event, ...args)
  }

  off(event: string, handler?: (data: unknown) => void) {
    if (!this.socket) throw new Error('Socket not initialized')
    this.socket.off(event, handler)
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }
}

export const websocketManager = new WebSocketManager()
