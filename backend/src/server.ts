import { validateEnv } from './config/env-validation.js';
import net from 'net';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initSentry, flushSentry } from './utils/sentry.js';

// Validate environment variables FIRST, before any other imports
const env = validateEnv();

// Initialize Sentry early (before other imports) if DSN is configured
initSentry();

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if port is already in use (prevent multiple instances)
async function checkPortAvailable(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        reject(new Error(
          `\n❌ Port ${port} is already in use!\n` +
          `   Another instance of the backend may be running.\n` +
          `   Stop the other instance or use a different port.\n` +
          `   To find the process: lsof -i :${port}\n`
        ));
      } else {
        reject(err);
      }
    });
    server.once('listening', () => {
      server.close();
      resolve();
    });
    server.listen(port);
  });
}

// Check port before importing heavy modules
await checkPortAvailable(env.PORT);

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { logger } from './utils/logger.js';
import { requestLogger } from './middleware/request-logger.js';
import { errorHandler } from './middleware/error-handler.js';
import { errorInjectionMiddleware } from './middleware/error-injection.js';
import { standardLimiter } from './middleware/rate-limit.js';
import { apiRoutes } from './routes/index.js';
import { initializeWebSocket } from './websocket/index.js';

const app = express();

// Environment variables already validated by validateEnv()
const PORT = env.PORT;

// Security middleware - comprehensive helmet configuration
app.use(
  helmet({
    // Content Security Policy - prevent XSS
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // HeroUI needs inline styles
        imgSrc: ["'self'", 'data:', 'blob:'],
        fontSrc: ["'self'"],
        connectSrc: ["'self'", 'ws:', 'wss:'], // WebSocket connections
        frameAncestors: ["'none'"], // Prevent clickjacking
        formAction: ["'self'"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
      },
    },

    // HTTP Strict Transport Security - force HTTPS
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },

    // Prevent clickjacking
    frameguard: { action: 'deny' },

    // Prevent MIME type sniffing
    noSniff: true,

    // XSS filter (legacy browsers)
    xssFilter: true,

    // Don't expose Express
    hidePoweredBy: true,

    // Referrer policy
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

    // Permissions policy (disable unnecessary features)
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  })
);

// HTTPS redirect in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    // Check X-Forwarded-Proto for reverse proxy setups
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.hostname}${req.url}`);
    }
    next();
  });
}

// Additional custom security headers
app.use((req, res, next) => {
  // Prevent caching of sensitive data
  if (req.path.startsWith('/api/')) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }

  // Additional security headers
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('X-XSS-Protection', '1; mode=block');

  next();
});

// CORS configuration - supports comma-separated origins
const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
app.use(
  cors({
    origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Kiosk-API-Key',
      'X-Display-API-Key',
      'X-Kiosk-ID',
    ],
    exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
  })
);

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parsing middleware (for httpOnly auth cookies)
app.use(cookieParser());

// Request logging
app.use(requestLogger);

// Error injection middleware for development testing
// Only active when NODE_ENV !== 'production'
if (process.env.NODE_ENV !== 'production') {
  app.use('/api', errorInjectionMiddleware);
}

// Global rate limiting for all API routes
// DISABLED FOR DEV - re-enable in production
// app.use('/api', standardLimiter);

// API routes
app.use('/api', apiRoutes);

// Error handler (must be last)
app.use(errorHandler);

// Create HTTP server for WebSocket attachment
export const httpServer = createServer(app);

// Initialize WebSocket server
const io = initializeWebSocket(httpServer);
logger.info('WebSocket server initialized');

// Graceful shutdown handling
const shutdown = async (signal: string): Promise<void> => {
  logger.info(`${signal} received, starting graceful shutdown...`);

  // Delete PID file
  const pidFile = path.join(__dirname, '../.backend.pid');
  try {
    if (fs.existsSync(pidFile)) {
      fs.unlinkSync(pidFile);
      logger.info('PID file removed');
    }
  } catch (err) {
    logger.warn('Failed to remove PID file:', err);
  }

  // Flush pending Sentry events
  await flushSentry(2000);

  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start server
httpServer.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT}`);
  logger.info(`Environment: ${env.NODE_ENV}`);
  logger.info(`API available at http://localhost:${PORT}/api`);

  // Write PID file for process management (prevents duplicate instances)
  const pidFile = path.join(__dirname, '../.backend.pid');
  try {
    fs.writeFileSync(pidFile, process.pid.toString());
    logger.info(`PID ${process.pid} written to ${pidFile}`);
  } catch (err) {
    logger.warn('Failed to write PID file:', err);
  }
});
