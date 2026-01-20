import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import { createExpressEndpoints } from '@ts-rest/express'
import { memberContract, checkinContract, divisionContract, badgeContract } from '@sentinel/contracts'
import { requestLogger } from './middleware/request-logger.js'
import { errorHandler, notFoundHandler } from './middleware/error-handler.js'
import { apiLimiter } from './middleware/rate-limit.js'
import { healthRouter } from './routes/health.js'
import { membersRouter } from './routes/members.js'
import { checkinsRouter } from './routes/checkins.js'
import { divisionsRouter } from './routes/divisions.js'
import { badgesRouter } from './routes/badges.js'
import { auth } from './lib/auth.js'
import { logger } from './lib/logger.js'

/**
 * Create and configure Express application
 */
export function createApp() {
  const app = express()

  // Trust proxy (required for rate limiting and IP detection when behind reverse proxy)
  app.set('trust proxy', 1)

  // Security middleware
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false, // Allow loading external resources
    })
  )

  // CORS configuration
  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
    : ['http://localhost:3000', 'http://localhost:5173']

  app.use(
    cors({
      origin: corsOrigins,
      credentials: true, // Allow cookies
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Correlation-ID'],
      exposedHeaders: ['X-Correlation-ID', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
    })
  )

  // Compression
  app.use(compression())

  // Body parsing
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true, limit: '10mb' }))

  // Cookie parsing
  app.use(cookieParser())

  // Request logging with correlation IDs
  app.use(requestLogger)

  // Rate limiting for API routes
  app.use('/api', apiLimiter)

  // Health check routes (no auth required)
  app.use(healthRouter)

  // Better-auth routes
  // This mounts the auth endpoints at /api/auth
  app.all('/api/auth/*', (req, res) => {
    try {
      return auth.handler(req as any)
    } catch (error) {
      logger.error('Auth handler error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        path: req.path,
      })
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Authentication service error',
      })
    }
  })

  // Application routes
  // Mount ts-rest routers
  createExpressEndpoints(memberContract, membersRouter, app)
  createExpressEndpoints(checkinContract, checkinsRouter, app)
  createExpressEndpoints(divisionContract, divisionsRouter, app)
  createExpressEndpoints(badgeContract, badgesRouter, app)

  // 404 handler (must be after all routes)
  app.use(notFoundHandler)

  // Error handler (must be last)
  app.use(errorHandler)

  return app
}
