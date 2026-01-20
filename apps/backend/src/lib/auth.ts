import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { PrismaClient } from '@sentinel/database'

/**
 * Better-auth configuration for Sentinel backend
 *
 * Features:
 * - Email/password authentication for admin users
 * - Session-based authentication with 7-day expiry
 * - Prisma adapter for database integration
 *
 * Note: API key authentication for kiosks is handled separately
 * via custom middleware (see middleware/auth.ts)
 *
 * @see https://better-auth.com/docs
 */

// Create Prisma client for better-auth
// Note: This is separate from the main app Prisma client to avoid connection pool issues
const prisma = new PrismaClient()

export const auth = betterAuth({
  // Database adapter
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  // Email and password authentication
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Admin users created manually
    minPasswordLength: 12,
    maxPasswordLength: 128,
  },

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Refresh session every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },

  // Security options
  advanced: {
    generateId: () => {
      // Use crypto.randomUUID() for ID generation
      return crypto.randomUUID()
    },
    cookieSameSite: 'lax',
    useSecureCookies: process.env.NODE_ENV === 'production',
  },

  // Base URL for auth endpoints
  baseURL: process.env.BASE_URL || 'http://localhost:3000',
  basePath: '/api/auth',

  // Trust proxy headers (for deployment behind reverse proxy)
  trustedOrigins: process.env.CORS_ORIGIN
    ? [process.env.CORS_ORIGIN]
    : ['http://localhost:3000', 'http://localhost:5173'],
})

/**
 * Type-safe auth session type
 */
export type Session = typeof auth.$Infer.Session

/**
 * Type-safe auth user type
 */
export type User = typeof auth.$Infer.Session.user
