import { validateEnv } from './config/env-validation.js';

// Validate environment variables FIRST, before any other imports
const env = validateEnv();

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { createServer } from 'http';
import { logger } from './utils/logger.js';
import { requestLogger } from './middleware/request-logger.js';
import { errorHandler } from './middleware/error-handler.js';
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

// Request logging
app.use(requestLogger);

// Global rate limiting for all API routes
app.use('/api', standardLimiter);

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
});
