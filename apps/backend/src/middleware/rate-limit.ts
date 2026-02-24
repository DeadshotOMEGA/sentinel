import rateLimit from 'express-rate-limit'
import { logger } from '../lib/logger.js'

/**
 * Rate limiting configuration
 *
 * Uses express-rate-limit with in-memory store.
 * For production with multiple instances, consider Redis store.
 */

const isDevelopment = process.env.NODE_ENV !== 'production'

const API_RATE_LIMIT_EXEMPT_ROUTES = new Set([
  'POST:/api/checkins',
  'POST:/api/checkins/bulk',
  'POST:/api/auth/rfid-login',
])

function normalizePath(path: string): string {
  if (path.length <= 1) return path
  return path.replace(/\/+$/, '')
}

function isApiRateLimitExempt(req: {
  method: string
  originalUrl?: string
  path?: string
}): boolean {
  const requestPath = req.originalUrl?.split('?')[0] ?? req.path ?? ''
  const routeKey = `${req.method.toUpperCase()}:${normalizePath(requestPath)}`
  return API_RATE_LIMIT_EXEMPT_ROUTES.has(routeKey)
}

/**
 * General API rate limiter
 *
 * Limits: 100 requests per 15 minutes per IP (production)
 * Limits: 1000 requests per 15 minutes per IP (development)
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 1000 : 100, // Higher limit in development for bulk operations
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting if feature is disabled
    if (process.env.ENABLE_RATE_LIMITING === 'false') {
      return true
    }

    // NFC/RFID ingestion endpoints can legitimately burst and should not be globally IP-throttled.
    if (isApiRateLimitExempt(req)) {
      return true
    }

    return false
  },
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    })

    res.status(429).json({
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: res.getHeader('Retry-After'),
    })
  },
})

/**
 * Strict rate limiter for auth endpoints
 *
 * Limits: 5 requests per 15 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per window
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (_req) => {
    return process.env.ENABLE_RATE_LIMITING === 'false'
  },
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    })

    res.status(429).json({
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later.',
      retryAfter: res.getHeader('Retry-After'),
    })
  },
})

/**
 * High-throughput limiter for RFID auth/checkin flows
 *
 * Limits: 10,000 requests per 15 minutes per IP
 */
export const rfidAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000,
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many RFID requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (_req) => {
    return process.env.ENABLE_RATE_LIMITING === 'false'
  },
  handler: (req, res) => {
    logger.warn('RFID auth rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    })

    res.status(429).json({
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many RFID requests, please try again later.',
      retryAfter: res.getHeader('Retry-After'),
    })
  },
})

/**
 * Relaxed rate limiter for public endpoints
 *
 * Limits: 300 requests per 15 minutes per IP
 */
export const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Higher limit for public endpoints
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (_req) => {
    return process.env.ENABLE_RATE_LIMITING === 'false'
  },
})
