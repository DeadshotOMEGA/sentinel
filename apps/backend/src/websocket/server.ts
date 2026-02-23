import { Server as HTTPServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import { logger } from '../lib/logger.js'
import { socketIOTransport } from '../lib/log-transport-socketio.js'
import { authenticateSocket } from './auth.js'
import { registerSocketHandlers } from './handlers.js'
import { setSocketIOServer } from './broadcast.js'

const connectionAttemptsByIp = new Map<string, number[]>()

function getClientIp(
  headers: Record<string, string | string[] | undefined>,
  fallback: string
): string {
  const forwardedFor = headers['x-forwarded-for']
  const forwarded = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]?.trim() || fallback
  }
  return fallback
}

function isWebSocketConnectionRateLimited(ip: string): boolean {
  if (process.env.ENABLE_RATE_LIMITING === 'false') {
    return false
  }

  const now = Date.now()
  const windowMs = 60_000
  const maxAttempts = process.env.NODE_ENV === 'production' ? 10 : 100
  const attempts = (connectionAttemptsByIp.get(ip) ?? []).filter((ts) => now - ts <= windowMs)
  attempts.push(now)

  if (attempts.length === 0) {
    connectionAttemptsByIp.delete(ip)
  } else {
    connectionAttemptsByIp.set(ip, attempts)
  }

  return attempts.length > maxAttempts
}

/**
 * Initialize Socket.IO server with authentication and rate limiting
 */
export function initializeWebSocketServer(httpServer: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
        : ['http://localhost:3000', 'http://localhost:5173'],
      credentials: true,
      methods: ['GET', 'POST'],
    },
    // Connection settings
    pingTimeout: 60000, // 60 seconds
    pingInterval: 25000, // 25 seconds
    upgradeTimeout: 10000, // 10 seconds
    maxHttpBufferSize: 1e6, // 1MB
    // Transport settings
    transports: ['websocket', 'polling'],
    allowEIO3: true, // Allow Engine.IO v3 clients
  })

  // Register Socket.IO instance for broadcasting
  setSocketIOServer(io)

  // Activate real-time log streaming transport
  socketIOTransport.setIO(io)

  io.use((socket, next) => {
    const ip = getClientIp(socket.handshake.headers, socket.handshake.address)
    if (isWebSocketConnectionRateLimited(ip)) {
      logger.warn('WebSocket connection rate limit exceeded', { ip })
      return next(new Error('Too many WebSocket connections from this IP'))
    }

    return next()
  })

  // Authentication middleware
  io.use(authenticateSocket)

  // Connection handler
  io.on('connection', (socket) => {
    logger.info('WebSocket client connected', {
      socketId: socket.id,
      userId: socket.data.userId,
      address: socket.handshake.address,
      transport: socket.conn.transport.name,
    })

    // Register event handlers
    registerSocketHandlers(socket)

    // Track connection stats
    const connectedSockets = io.sockets.sockets.size
    logger.debug('WebSocket connection stats', {
      connectedSockets,
      rooms: Array.from(socket.rooms),
    })
  })

  // Error handling
  io.engine.on('connection_error', (err) => {
    logger.error('WebSocket connection error', {
      error: err.message,
      code: err.code,
      context: err.context,
    })
  })

  logger.info('WebSocket server initialized', {
    transports: ['websocket', 'polling'],
    cors: true,
  })

  return io
}

/**
 * Get current WebSocket server statistics
 */
export function getWebSocketStats(io: SocketIOServer) {
  const sockets = io.sockets.sockets
  const rooms = io.sockets.adapter.rooms

  return {
    connectedClients: sockets.size,
    rooms: Array.from(rooms.keys()).filter((room) => !sockets.has(room)), // Filter out socket IDs
    roomCounts: Object.fromEntries(
      Array.from(rooms.entries())
        .filter(([room]) => !sockets.has(room))
        .map(([room, clients]) => [room, clients.size])
    ),
  }
}

/**
 * Gracefully shutdown WebSocket server
 */
export async function shutdownWebSocketServer(io: SocketIOServer): Promise<void> {
  logger.info('Shutting down WebSocket server...')

  // Notify all connected clients
  io.emit('server:shutdown', {
    message: 'Server is shutting down',
    timestamp: new Date().toISOString(),
  })

  // Wait for clients to disconnect gracefully
  await new Promise<void>((resolve) => {
    setTimeout(() => {
      io.close(() => {
        logger.info('WebSocket server closed')
        resolve()
      })
    }, 1000)
  })
}
