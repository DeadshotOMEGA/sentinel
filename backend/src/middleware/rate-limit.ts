import rateLimit from 'express-rate-limit';
import type { Request } from 'express';

// Standard API rate limit - 100 requests per minute
// Uses default keyGenerator which properly handles IPv6
export const standardLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: 60,
  },
  // Use default keyGenerator - handles IPv4/IPv6 properly
});

// Strict rate limit for auth endpoints - 5 attempts per 15 minutes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many login attempts. Please try again later.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
    retryAfter: 900, // 15 minutes in seconds
  },
  // Disable validation - we handle IP extraction manually
  validate: false,
  keyGenerator: (req: Request) => {
    // Rate limit by IP + username combination to prevent distributed attacks
    const forwardedFor = req.headers['x-forwarded-for'];
    let clientIp: string;
    if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
      clientIp = forwardedFor.split(',')[0].trim();
    } else if (req.socket?.remoteAddress) {
      clientIp = req.socket.remoteAddress;
    } else {
      throw new Error('Unable to determine client IP address for rate limiting');
    }
    const username = typeof req.body?.username === 'string' ? req.body.username : 'anonymous';
    return `auth:${clientIp}:${username}`;
  },
  skipSuccessfulRequests: false, // Count all attempts, even successful ones
});

// Kiosk badge scan rate limit - 60 scans per minute per kiosk
export const kioskLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Badge scanning too fast. Please wait.',
    code: 'KIOSK_RATE_LIMIT_EXCEEDED',
    retryAfter: 60,
  },
  // Disable validation - we handle IP extraction manually
  validate: false,
  keyGenerator: (req: Request) => {
    // Rate limit by kiosk ID (from header) - preferred
    const kioskId = req.headers['x-kiosk-id'];
    if (typeof kioskId === 'string' && kioskId.length > 0) {
      return `kiosk:${kioskId}`;
    }
    // Fall back to IP address
    if (req.socket?.remoteAddress) {
      return `kiosk-ip:${req.socket.remoteAddress}`;
    }
    throw new Error('Unable to determine kiosk ID or IP address for rate limiting');
  },
});

// Bulk operation rate limit - 10 per hour
export const bulkLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many bulk operations. Please wait before importing more data.',
    code: 'BULK_RATE_LIMIT_EXCEEDED',
    retryAfter: 3600,
  },
});
