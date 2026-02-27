import 'dotenv/config'
import { execFile } from 'node:child_process'
import { createServer } from 'http'
import { promisify } from 'node:util'
import { createApp } from './app.js'
import { logger, logStartup, logShutdown, logUnhandledError } from './lib/logger.js'
import { configurePrismaLogging } from './lib/database.js'
import { initializeWebSocketServer, shutdownWebSocketServer } from './websocket/server.js'
import { startJobScheduler, stopJobScheduler } from './jobs/index.js'
import { tailscaleDeviceService } from './services/tailscale-device-service.js'
import { SentinelBootstrapIntegrityService } from './services/sentinel-bootstrap-integrity-service.js'
import { getPrismaClient } from './lib/database.js'

const execFileAsync = promisify(execFile)

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

function isTruthy(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) {
    return defaultValue
  }

  const normalized = value.trim().toLowerCase()
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) {
    return true
  }
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) {
    return false
  }
  return defaultValue
}

async function runStartupEnumSeed(): Promise<void> {
  const autoSeedEnabled = isTruthy(process.env.SENTINEL_AUTO_SEED_ENUMS, true)
  if (!autoSeedEnabled) {
    logger.info('Startup enum seed disabled via SENTINEL_AUTO_SEED_ENUMS')
    return
  }

  const maxAttemptsRaw = Number.parseInt(process.env.SENTINEL_AUTO_SEED_ATTEMPTS ?? '3', 10)
  const retryDelayRaw = Number.parseInt(process.env.SENTINEL_AUTO_SEED_RETRY_DELAY_MS ?? '3000', 10)
  const maxAttempts = Number.isNaN(maxAttemptsRaw) || maxAttemptsRaw < 1 ? 3 : maxAttemptsRaw
  const retryDelayMs = Number.isNaN(retryDelayRaw) || retryDelayRaw < 500 ? 3000 : retryDelayRaw

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const { stdout, stderr } = await execFileAsync('pnpm', ['sentinel:seed-default-enums'], {
        cwd: process.cwd(),
        env: process.env,
        timeout: 180_000,
        maxBuffer: 10 * 1024 * 1024,
      })

      const outputLines = stdout
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
      const summaryLine = outputLines.find((line) => line.includes('enum seed complete'))

      logger.info('Startup enum seed completed', {
        attempt,
        summary: summaryLine ?? 'No summary line emitted',
      })

      if (stderr.trim().length > 0) {
        logger.warn('Startup enum seed emitted stderr output', {
          stderr: stderr.trim().slice(-1500),
        })
      }

      return
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      if (attempt >= maxAttempts) {
        logger.warn('Startup enum seed failed; continuing without blocking startup', {
          attempts: maxAttempts,
          error: message,
        })
        return
      }

      logger.warn('Startup enum seed attempt failed; retrying', {
        attempt,
        maxAttempts,
        retryDelayMs,
        error: message,
      })

      await new Promise((resolve) => setTimeout(resolve, retryDelayMs))
    }
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

    await runStartupEnumSeed()
    try {
      const bootstrapIntegrityService = new SentinelBootstrapIntegrityService(getPrismaClient())
      const identity = await bootstrapIntegrityService.ensureIntegrity()
      logger.info('Sentinel bootstrap account integrity verified', {
        memberId: identity.memberId,
        badgeId: identity.badgeId,
        badgeSerial: identity.badgeSerial,
      })
    } catch (error) {
      logger.warn('Sentinel bootstrap account integrity check failed; continuing startup', {
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

      tailscaleDeviceService.stop()

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
