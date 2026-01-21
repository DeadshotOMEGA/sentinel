import { Router } from 'express'
import { getPrismaClient } from '../lib/database.js'
import { logger } from '../lib/logger.js'

export const healthRouter = Router()

/**
 * Overall health check
 *
 * Checks database connectivity and returns overall service health
 *
 * Returns:
 * - 200 OK if all services are healthy
 * - 503 Service Unavailable if any service is unhealthy
 */
healthRouter.get('/health', async (_req, res) => {
  const checks = {
    database: false,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  }

  try {
    // Check database connectivity
    await getPrismaClient().$queryRaw`SELECT 1`
    checks.database = true
  } catch (error) {
    logger.error('Database health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }

  const healthy = checks.database
  const statusCode = healthy ? 200 : 503

  res.status(statusCode).json({
    status: healthy ? 'healthy' : 'unhealthy',
    checks,
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '2.0.0',
  })
})

/**
 * Kubernetes readiness probe
 *
 * Indicates whether the application is ready to serve traffic
 *
 * Returns:
 * - 200 OK if ready
 * - 503 Service Unavailable if not ready
 */
healthRouter.get('/ready', async (_req, res) => {
  try {
    // Check if database is accessible
    await getPrismaClient().$queryRaw`SELECT 1`

    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Readiness check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    res.status(503).json({
      status: 'not ready',
      error: 'Database connection failed',
      timestamp: new Date().toISOString(),
    })
  }
})

/**
 * Kubernetes liveness probe
 *
 * Indicates whether the application is alive and should not be restarted
 *
 * Always returns 200 OK unless the process is completely hung
 */
healthRouter.get('/live', (_req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

/**
 * Basic metrics endpoint
 *
 * Returns basic application metrics for monitoring
 */
healthRouter.get('/metrics', (_req, res) => {
  const memoryUsage = process.memoryUsage()

  res.status(200).json({
    uptime: process.uptime(),
    memory: {
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      external: memoryUsage.external,
      rss: memoryUsage.rss,
    },
    cpu: process.cpuUsage(),
    platform: process.platform,
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  })
})
