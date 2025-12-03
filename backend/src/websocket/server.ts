import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents } from './events';
import { getSession } from '../auth/session';
import { logger } from '../utils/logger';
import {
  isConnectionRateLimited,
  decrementConnectionCount,
  SocketEventRateLimiter,
} from './rate-limit';
import { incrementWsConnections, decrementWsConnections } from '../utils/metrics';
import { presenceService } from '../services/presence-service';

// Session validation interval (5 minutes)
const SESSION_CHECK_INTERVAL = 5 * 60 * 1000;

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

interface SocketAuth {
  userId: string;
  username: string;
  role: 'admin' | 'coxswain' | 'readonly' | 'kiosk' | 'display';
  authType: 'jwt' | 'kiosk_key' | 'display_key';
}

// Extend Socket type to include auth data and rate limiter
declare module 'socket.io' {
  interface Socket {
    auth?: SocketAuth;
    sessionToken?: string;
    rateLimiter?: SocketEventRateLimiter;
    sessionCheckInterval?: NodeJS.Timeout;
  }
}

let io: TypedServer;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
}

function getKioskApiKey(): string {
  const key = process.env.KIOSK_API_KEY;
  if (!key) {
    throw new Error('KIOSK_API_KEY environment variable is required');
  }
  return key;
}

function getDisplayApiKey(): string | undefined {
  return process.env.DISPLAY_API_KEY;
}

/**
 * Authenticate Socket.IO connections
 * Supports three authentication methods:
 * 1. JWT token (admin users)
 * 2. Kiosk API key (kiosk terminals)
 * 3. Display API key (TV displays - read-only)
 */
async function authenticateSocket(socket: TypedSocket): Promise<boolean> {
  const auth = socket.handshake.auth as Record<string, unknown>;

  // 1. Try JWT token authentication
  if (auth.token && typeof auth.token === 'string') {
    try {
      const session = await getSession(auth.token);
      if (session) {
        socket.auth = {
          userId: session.userId,
          username: session.username,
          role: session.role,
          authType: 'jwt',
        };
        // Store token for session expiry monitoring
        socket.sessionToken = auth.token;
        return true;
      }
    } catch (error) {
      logger.error('JWT authentication error:', error);
    }
  }

  // 2. Try kiosk API key authentication
  if (auth.kioskApiKey && typeof auth.kioskApiKey === 'string') {
    const expectedKey = getKioskApiKey();
    if (auth.kioskApiKey === expectedKey) {
      socket.auth = {
        userId: 'kiosk-device',
        username: 'kiosk',
        role: 'kiosk',
        authType: 'kiosk_key',
      };
      return true;
    }
    logger.warn(`Invalid kiosk API key attempt from ${socket.handshake.address}`);
    socket.disconnect(true);
    return false;
  }

  // 3. Try display API key authentication
  if (auth.displayApiKey && typeof auth.displayApiKey === 'string') {
    const expectedKey = getDisplayApiKey();
    if (expectedKey && auth.displayApiKey === expectedKey) {
      socket.auth = {
        userId: 'display-device',
        username: 'display',
        role: 'display',
        authType: 'display_key',
      };
      return true;
    }
    if (expectedKey) {
      logger.warn(`Invalid display API key attempt from ${socket.handshake.address}`);
    }
    socket.disconnect(true);
    return false;
  }

  // No valid authentication provided
  logger.warn(`Unauthenticated connection attempt from ${socket.handshake.address}`);
  socket.disconnect(true);
  return false;
}

export function initializeWebSocket(httpServer: HttpServer): TypedServer {
  if (!process.env.CORS_ORIGIN) {
    throw new Error('CORS_ORIGIN environment variable is required');
  }

  const allowedOrigins = process.env.CORS_ORIGIN.split(',').map((o) => o.trim());
  io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Rate limiting middleware (runs before auth)
  io.use(async (socket, next) => {
    try {
      const isLimited = await isConnectionRateLimited(socket);
      if (isLimited) {
        next(new Error('Too many connection attempts. Please try again later.'));
        return;
      }
      next();
    } catch (error) {
      logger.error('WebSocket rate limit check error:', error);
      // Allow connection on rate limit check failure
      next();
    }
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const isAuthenticated = await authenticateSocket(socket);
      if (isAuthenticated) {
        // Initialize event rate limiter
        socket.rateLimiter = new SocketEventRateLimiter(socket.id);
        next();
      } else {
        next(new Error('Authentication failed. Please provide a valid token or API key.'));
      }
    } catch (error) {
      logger.error('WebSocket authentication error:', error);
      next(new Error('Authentication error. Please try again.'));
    }
  });

  io.on('connection', (socket: TypedSocket) => {
    // Track WebSocket connections for metrics
    incrementWsConnections();

    const authInfo = socket.auth ? ` (${socket.auth.authType}: ${socket.auth.username})` : '';
    logger.info(`Client connected: ${socket.id}${authInfo}`);

    // Session expiry monitoring for JWT-authenticated sockets
    if (socket.auth?.authType === 'jwt' && socket.sessionToken) {
      socket.sessionCheckInterval = setInterval(async () => {
        try {
          const session = await getSession(socket.sessionToken!);
          if (!session) {
            logger.info(`Session expired for socket ${socket.id}, disconnecting`);
            socket.emit('session_expired');
            socket.disconnect(true);
          }
        } catch (error) {
          logger.error(`Session validation error for socket ${socket.id}:`, error);
        }
      }, SESSION_CHECK_INTERVAL);
    }

    // Handle subscription to presence updates
    socket.on('subscribe_presence', async () => {
      // Rate limit check
      if (socket.rateLimiter && !socket.rateLimiter.checkEvent()) {
        return;
      }
      socket.join('presence');
      logger.info(`Client ${socket.id} subscribed to presence updates`);

      // Send activity backfill
      try {
        const activity = await presenceService.getRecentActivity(50);
        socket.emit('activity_backfill', { activity });
        logger.info(`Sent activity backfill (${activity.length} items) to ${socket.id}`);
      } catch (error) {
        logger.error(`Failed to send activity backfill to ${socket.id}:`, error);
      }
    });

    socket.on('unsubscribe_presence', () => {
      if (socket.rateLimiter && !socket.rateLimiter.checkEvent()) {
        return;
      }
      socket.leave('presence');
      logger.info(`Client ${socket.id} unsubscribed from presence updates`);
    });

    // Handle event subscription (requires admin/coxswain/readonly role)
    socket.on('subscribe_event', (data) => {
      if (socket.rateLimiter && !socket.rateLimiter.checkEvent()) {
        return;
      }
      if (!socket.auth) {
        logger.warn(`Unauthenticated event subscription attempt from ${socket.id}`);
        return;
      }
      // Only admin, coxswain, and readonly roles can subscribe to event updates
      const allowedRoles = ['admin', 'coxswain', 'readonly'];
      if (!allowedRoles.includes(socket.auth.role)) {
        logger.warn(`Unauthorized event subscription attempt from ${socket.id} (role: ${socket.auth.role})`);
        return;
      }
      const eventId = data.eventId;
      socket.join(`event:${eventId}`);
      logger.info(`Client ${socket.id} subscribed to event ${eventId}`);
    });

    socket.on('unsubscribe_event', (data) => {
      if (socket.rateLimiter && !socket.rateLimiter.checkEvent()) {
        return;
      }
      const eventId = data.eventId;
      socket.leave(`event:${eventId}`);
      logger.info(`Client ${socket.id} unsubscribed from event ${eventId}`);
    });

    // Handle kiosk heartbeats (kiosk auth only)
    socket.on('kiosk_heartbeat', (data) => {
      if (socket.rateLimiter && !socket.rateLimiter.checkEvent()) {
        return;
      }
      if (!socket.auth || socket.auth.role !== 'kiosk') {
        logger.warn(`Unauthorized kiosk heartbeat attempt from ${socket.id}`);
        return;
      }
      // Broadcast kiosk status to admin clients
      io.emit('kiosk_status', {
        kioskId: data.kioskId,
        status: 'online',
        queueSize: data.queueSize,
        lastSeen: new Date().toISOString(),
      });
    });

    socket.on('disconnect', async () => {
      // Track WebSocket disconnections for metrics
      decrementWsConnections();

      logger.info(`Client disconnected: ${socket.id}`);
      // Clear session check interval
      if (socket.sessionCheckInterval) {
        clearInterval(socket.sessionCheckInterval);
      }
      // Decrement connection count for rate limiting
      await decrementConnectionCount(socket);
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
