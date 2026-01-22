import { Server as HTTPServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import { logger } from '../lib/logger.js'
import { authenticateSocket } from './auth.js'
import { registerSocketHandlers } from './handlers.js'
import { setSocketIOServer } from './broadcast.js'

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

  // TODO Phase 3: Apply rate limiting for connections (per IP)
  // const connectionLimiter = rateLimit({
  //   windowMs: 60 * 1000, // 1 minute
  //   max: 10, // 10 connections per minute per IP
  //   message: 'Too many WebSocket connections from this IP',
  //   standardHeaders: true,
  //   legacyHeaders: false,
  // })

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
