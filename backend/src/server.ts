import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { createServer } from 'http';
import { logger } from './utils/logger.js';
import { requestLogger } from './middleware/request-logger.js';
import { errorHandler } from './middleware/error-handler.js';
import { apiRoutes } from './routes/index.js';
import { initializeWebSocket } from './websocket/index.js';

const app = express();

// Validate required environment variables
if (!process.env.PORT) {
  throw new Error('PORT environment variable is required');
}
const PORT = parseInt(process.env.PORT, 10);

if (!process.env.CORS_ORIGIN) {
  throw new Error('CORS_ORIGIN environment variable is required');
}

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

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
  const env = process.env.NODE_ENV;
  if (!env) {
    throw new Error('NODE_ENV environment variable is required');
  }

  logger.info(`Server listening on port ${PORT}`);
  logger.info(`Environment: ${env}`);
  logger.info(`API available at http://localhost:${PORT}/api`);
});
