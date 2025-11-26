import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents } from './events';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

let io: TypedServer;

export function initializeWebSocket(httpServer: HttpServer): TypedServer {
  if (!process.env.CORS_ORIGIN) {
    throw new Error('CORS_ORIGIN environment variable is required');
  }

  io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket: TypedSocket) => {
    console.log(`Client connected: ${socket.id}`);

    // Handle subscription to presence updates
    socket.on('subscribe_presence', () => {
      socket.join('presence');
      console.log(`Client ${socket.id} subscribed to presence updates`);
    });

    socket.on('unsubscribe_presence', () => {
      socket.leave('presence');
      console.log(`Client ${socket.id} unsubscribed from presence updates`);
    });

    // Handle kiosk heartbeats
    socket.on('kiosk_heartbeat', (data) => {
      // Broadcast kiosk status to admin clients
      io.emit('kiosk_status', {
        kioskId: data.kioskId,
        status: 'online',
        queueSize: data.queueSize,
        lastSeen: new Date().toISOString(),
      });
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): TypedServer {
  if (!io) {
    throw new Error('WebSocket server not initialized');
  }
  return io;
}
