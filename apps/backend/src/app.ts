import express, { type Express } from 'express'
import helmet from 'helmet'
import cors from 'cors'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import { createExpressEndpoints } from '@ts-rest/express'
import {
  memberContract,
  checkinContract,
  divisionContract,
  badgeContract,
  eventContract,
  visitorContract,
  securityAlertContract,
  ddsContract,
  lockupContract,
  visitTypesContract,
  memberStatusesContract,
  memberTypesContract,
  badgeStatusesContract,
  tagsContract,
  settingContract,
  adminUserContract,
  listContract,
  rankContract,
  // TODO: Fix training-years router type issues
  // trainingYearContract,
  bmqCourseContract,
  reportSettingContract,
  alertConfigContract,
  reportContract,
  devToolsContract,
  devContract,
  databaseExplorerContract,
  qualificationContract,
  scheduleContract,
  unitEventContract,
  statHolidayContract,
  tagContract,
} from '@sentinel/contracts'
import { requireAuth } from './middleware/auth.js'
import { requestLogger } from './middleware/request-logger.js'
import { metricsMiddleware } from './middleware/metrics.js'
import { errorHandler, notFoundHandler } from './middleware/error-handler.js'
import { apiLimiter, authLimiter } from './middleware/rate-limit.js'
import { healthRouter } from './routes/health.js'
import { swaggerRouter, redocRouter, openapiRouter } from './routes/swagger.js'
import { swaggerAuth } from './middleware/swagger-auth.js'
import { membersRouter } from './routes/members.js'
import { checkinsRouter } from './routes/checkins.js'
import { divisionsRouter } from './routes/divisions.js'
import { badgesRouter } from './routes/badges.js'
import { eventsRouter } from './routes/events.js'
import { visitorsRouter } from './routes/visitors.js'
import { securityAlertsRouter } from './routes/security-alerts.js'
import { ddsRouter } from './routes/dds.js'
import { lockupRouter } from './routes/lockup.js'
import {
  visitTypesRouter,
  memberStatusesRouter,
  memberTypesRouter,
  badgeStatusesRouter,
  tagsRouter as enumTagsRouter,
} from './routes/enums.js'
import { settingsRouter } from './routes/settings.js'
import { adminUsersRouter } from './routes/admin-users.js'
import { listsRouter } from './routes/lists.js'
// TODO: Fix training-years router type issues
// import { trainingYearsRouter } from './routes/training-years.js'
import { bmqCoursesRouter } from './routes/bmq-courses.js'
import { reportSettingsRouter } from './routes/report-settings.js'
import { alertConfigsRouter } from './routes/alert-configs.js'
import { reportsRouter } from './routes/reports.js'
import { devToolsRouter } from './routes/dev-tools.js'
import { devRouter } from './routes/dev.js'
import { databaseExplorerRouter } from './routes/database-explorer.js'
import { ranksRouter } from './routes/ranks.js'
import { qualificationsRouter } from './routes/qualifications.js'
import { schedulesRouter } from './routes/schedules.js'
import { unitEventsRouter } from './routes/unit-events.js'
import { statHolidaysRouter } from './routes/stat-holidays.js'
import { tagsRouter } from './routes/tags.js'
import { authRouter } from './routes/auth.js'
import authRfidRouter from './routes/auth-rfid.js'
import adminRouter from './routes/admin.js'

/**
 * Create and configure Express application
 */
export function createApp(): Express {
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
      exposedHeaders: [
        'X-Correlation-ID',
        'RateLimit-Limit',
        'RateLimit-Remaining',
        'RateLimit-Reset',
      ],
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

  // Prometheus metrics tracking
  app.use(metricsMiddleware)

  // Rate limiting for API routes
  app.use('/api', apiLimiter)

  // Populate req.member from session cookie when present (non-blocking — does not reject unauthenticated requests)
  // This allows ts-rest handlers to inspect req.member for role-based access control
  app.use('/api', requireAuth(false))

  // Health check routes (no auth required)
  app.use(healthRouter)

  // API Documentation routes (conditional auth)
  // Skip in test environment to avoid port conflicts
  if (process.env.NODE_ENV !== 'test') {
    app.use('/docs', swaggerAuth, swaggerRouter)
    app.use('/redoc', swaggerAuth, redocRouter)
    app.use('/openapi.json', openapiRouter)
  }

  // Badge+PIN auth routes
  app.use('/api/auth/login', authLimiter)
  app.use('/api/auth/rfid-login', authLimiter)
  app.use('/api/auth', authRouter)

  // Application routes
  // Mount ts-rest routers with validation enabled
  createExpressEndpoints(memberContract, membersRouter, app, {
    requestValidationErrorHandler: (err, _req, res) => {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        issues: err.body?.issues || err.pathParams?.issues || err.query?.issues || [],
      })
    },
  })
  createExpressEndpoints(checkinContract, checkinsRouter, app, {
    requestValidationErrorHandler: (err, _req, res) => {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        issues: err.body?.issues || err.pathParams?.issues || err.query?.issues || [],
      })
    },
  })
  createExpressEndpoints(divisionContract, divisionsRouter, app, {
    requestValidationErrorHandler: (err, _req, res) => {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        issues: err.body?.issues || err.pathParams?.issues || err.query?.issues || [],
      })
    },
  })
  createExpressEndpoints(badgeContract, badgesRouter, app, {
    requestValidationErrorHandler: (err, _req, res) => {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        issues: err.body?.issues || err.pathParams?.issues || err.query?.issues || [],
      })
    },
  })
  createExpressEndpoints(eventContract, eventsRouter, app, {
    requestValidationErrorHandler: (err, _req, res) => {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        issues: err.body?.issues || err.pathParams?.issues || err.query?.issues || [],
      })
    },
  })
  createExpressEndpoints(visitorContract, visitorsRouter, app, {
    requestValidationErrorHandler: (err, _req, res) => {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        issues: err.body?.issues || err.pathParams?.issues || err.query?.issues || [],
      })
    },
  })
  createExpressEndpoints(securityAlertContract, securityAlertsRouter, app, {
    requestValidationErrorHandler: (err, _req, res) => {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        issues: err.body?.issues || err.pathParams?.issues || err.query?.issues || [],
      })
    },
  })
  createExpressEndpoints(ddsContract, ddsRouter, app, {
    requestValidationErrorHandler: (err, _req, res) => {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        issues: err.body?.issues || err.pathParams?.issues || err.query?.issues || [],
      })
    },
  })
  createExpressEndpoints(lockupContract, lockupRouter, app, {
    requestValidationErrorHandler: (err, _req, res) => {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        issues: err.body?.issues || err.pathParams?.issues || err.query?.issues || [],
      })
    },
  })
  createExpressEndpoints(visitTypesContract, visitTypesRouter, app, {
    requestValidationErrorHandler: (err, _req, res) => {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        issues: err.body?.issues || err.pathParams?.issues || err.query?.issues || [],
      })
    },
  })
  createExpressEndpoints(memberStatusesContract, memberStatusesRouter, app, {
    requestValidationErrorHandler: (err, _req, res) => {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        issues: err.body?.issues || err.pathParams?.issues || err.query?.issues || [],
      })
    },
  })
  createExpressEndpoints(memberTypesContract, memberTypesRouter, app, {
    requestValidationErrorHandler: (err, _req, res) => {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        issues: err.body?.issues || err.pathParams?.issues || err.query?.issues || [],
      })
    },
  })
  createExpressEndpoints(badgeStatusesContract, badgeStatusesRouter, app, {
    requestValidationErrorHandler: (err, _req, res) => {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        issues: err.body?.issues || err.pathParams?.issues || err.query?.issues || [],
      })
    },
  })
  createExpressEndpoints(tagsContract, enumTagsRouter, app, {
    requestValidationErrorHandler: (err, _req, res) => {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        issues: err.body?.issues || err.pathParams?.issues || err.query?.issues || [],
      })
    },
  })
  createExpressEndpoints(settingContract, settingsRouter, app, {
    requestValidationErrorHandler: (err, _req, res) => {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        issues: err.body?.issues || err.pathParams?.issues || err.query?.issues || [],
      })
    },
  })
  createExpressEndpoints(adminUserContract, adminUsersRouter, app, {
    requestValidationErrorHandler: (err, _req, res) => {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        issues: err.body?.issues || err.pathParams?.issues || err.query?.issues || [],
      })
    },
  })
  createExpressEndpoints(listContract, listsRouter, app, {
    requestValidationErrorHandler: (err, _req, res) => {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        issues: err.body?.issues || err.pathParams?.issues || err.query?.issues || [],
      })
    },
  })
  createExpressEndpoints(rankContract, ranksRouter, app, {
    requestValidationErrorHandler: (err, _req, res) => {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        issues: err.body?.issues || err.pathParams?.issues || err.query?.issues || [],
      })
    },
  })
  // TODO: Fix training-years router type issues
  // createExpressEndpoints(trainingYearContract, trainingYearsRouter, app, {
  //   requestValidationErrorHandler: (err, _req, res) => {
  //     return res.status(400).json({
  //       error: 'VALIDATION_ERROR',
  //       message: 'Request validation failed',
  //       issues: err.body?.issues || err.pathParams?.issues || err.query?.issues || [],
  //     })
  //   },
  // })
  createExpressEndpoints(bmqCourseContract, bmqCoursesRouter, app, {
    requestValidationErrorHandler: (err, _req, res) => {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        issues: err.body?.issues || err.pathParams?.issues || err.query?.issues || [],
      })
    },
  })
  createExpressEndpoints(reportSettingContract, reportSettingsRouter, app, {
    requestValidationErrorHandler: (err, _req, res) => {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        issues: err.body?.issues || err.pathParams?.issues || err.query?.issues || [],
      })
    },
  })
  createExpressEndpoints(alertConfigContract, alertConfigsRouter, app, {
    requestValidationErrorHandler: (err, _req, res) => {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        issues: err.body?.issues || err.pathParams?.issues || err.query?.issues || [],
      })
    },
  })
  createExpressEndpoints(reportContract, reportsRouter, app, {
    requestValidationErrorHandler: (err, _req, res) => {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        issues: err.body?.issues || err.pathParams?.issues || err.query?.issues || [],
      })
    },
  })
  createExpressEndpoints(devToolsContract, devToolsRouter, app, {
    requestValidationErrorHandler: (err, _req, res) => {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        issues: err.body?.issues || err.pathParams?.issues || err.query?.issues || [],
      })
    },
  })
  createExpressEndpoints(devContract, devRouter, app, {
    requestValidationErrorHandler: (err, _req, res) => {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        issues: err.body?.issues || err.pathParams?.issues || err.query?.issues || [],
      })
    },
  })
  createExpressEndpoints(databaseExplorerContract, databaseExplorerRouter, app, {
    requestValidationErrorHandler: (err, _req, res) => {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        issues: err.body?.issues || err.pathParams?.issues || err.query?.issues || [],
      })
    },
  })
  createExpressEndpoints(qualificationContract, qualificationsRouter, app, {
    requestValidationErrorHandler: (err, _req, res) => {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        issues: err.body?.issues || err.pathParams?.issues || err.query?.issues || [],
      })
    },
  })
  createExpressEndpoints(scheduleContract, schedulesRouter, app, {
    requestValidationErrorHandler: (err, _req, res) => {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        issues: err.body?.issues || err.pathParams?.issues || err.query?.issues || [],
      })
    },
  })
  createExpressEndpoints(unitEventContract, unitEventsRouter, app, {
    requestValidationErrorHandler: (err, _req, res) => {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        issues: err.body?.issues || err.pathParams?.issues || err.query?.issues || [],
      })
    },
  })
  createExpressEndpoints(statHolidayContract, statHolidaysRouter, app, {
    requestValidationErrorHandler: (err, _req, res) => {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        issues: err.body?.issues || err.pathParams?.issues || err.query?.issues || [],
      })
    },
  })
  createExpressEndpoints(tagContract, tagsRouter, app, {
    requestValidationErrorHandler: (err, _req, res) => {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        issues: err.body?.issues || err.pathParams?.issues || err.query?.issues || [],
      })
    },
  })

  // Custom auth routes
  app.use('/api/auth', authRfidRouter)
  app.use('/api/admin', adminRouter)

  // 404 handler (must be after all routes)
  app.use(notFoundHandler)

  // Error handler (must be last)
  app.use(errorHandler)

  return app
}
