import 'dotenv/config'
import { createServer } from 'http'
import { createApp } from './app.js'
import { logger, logStartup, logShutdown, logUnhandledError } from './lib/logger.js'
import { configurePrismaLogging } from './lib/database.js'
import { initializeWebSocketServer, shutdownWebSocketServer } from './websocket/server.js'
import { startJobScheduler, stopJobScheduler } from './jobs/index.js'

/**
 * Validate required environment variables
 */
function validateEnvironment() {
  const required = ['DATABASE_URL']

  const missing = required.filter((key) => !process.env[key])

  if (missing.length > 0) {
    logger.error('Missing required environment variables', {
      missing,
    })
    process.exit(1)
  }

  // Warn about missing optional variables
  const optional = ['JWT_SECRET', 'API_KEY_SECRET', 'CORS_ORIGIN']
  const missingOptional = optional.filter((key) => !process.env[key])

  if (missingOptional.length > 0) {
    logger.warn('Missing optional environment variables', {
      missing: missingOptional,
    })
  }
}

/**
 * Main application entry point
 */
async function main() {
  try {
    // Validate environment
    validateEnvironment()

    // Wire Prisma events to Winston
    try {
      const { prisma } = await import('@sentinel/database')
      configurePrismaLogging(prisma)
    } catch (error) {
      logger.warn('Failed to configure Prisma logging', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    // Create Express app
    const app = createApp()

    // Create HTTP server
    const httpServer = createServer(app)

    // Initialize WebSocket server
    const io = initializeWebSocketServer(httpServer)

    // Get port from environment
    const port = parseInt(process.env.PORT || '3000', 10)
    const host = process.env.HOST || '0.0.0.0'

    // Start server
    httpServer.listen(port, host, async () => {
      logStartup(port, process.env.NODE_ENV || 'development')
      logger.info('Server listening', {
        port,
        host,
        url: `http://localhost:${port}`,
      })

      // Start job scheduler (after server is listening)
      try {
        await startJobScheduler({
          timezone: process.env.TIMEZONE || 'America/Winnipeg',
          dayRolloverTime: process.env.DAY_ROLLOVER_TIME || '03:00',
          dutyWatchAlertTime: process.env.DUTY_WATCH_ALERT_TIME || '19:00',
          lockupWarningTime: process.env.LOCKUP_WARNING_TIME || '22:00',
          lockupCriticalTime: process.env.LOCKUP_CRITICAL_TIME || '23:00',
        })
      } catch (error) {
        logger.error('Failed to start job scheduler', {
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        // Don't fail startup if jobs fail - the server can still operate
      }
    })

    // Graceful shutdown handlers
    const shutdown = async (signal: string) => {
      logShutdown(signal)

      // Stop job scheduler first
      try {
        await stopJobScheduler()
      } catch (error) {
        logger.error('Error stopping job scheduler', {
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }

      // Shutdown WebSocket server
      await shutdownWebSocketServer(io)

      httpServer.close(() => {
        logger.info('HTTP server closed')
        process.exit(0)
      })

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout')
        process.exit(1)
      }, 10000)
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT', () => shutdown('SIGINT'))

    // Handle uncaught exceptions and unhandled rejections
    process.on('uncaughtException', (error) => {
      logUnhandledError(error, 'uncaughtException')
      process.exit(1)
    })

    process.on('unhandledRejection', (reason) => {
      const error = reason instanceof Error ? reason : new Error(String(reason))
      logUnhandledError(error, 'unhandledRejection')
      process.exit(1)
    })
  } catch (error) {
    logger.error('Failed to start application', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })
    process.exit(1)
  }
}

// Start the application
main()
