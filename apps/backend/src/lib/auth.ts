import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma } from '@sentinel/database'
import { admin, apiKey } from 'better-auth/plugins'
import { randomUUID } from 'crypto'

/**
 * Better-auth configuration for Sentinel backend
 *
 * Features:
 * - Email/password authentication for admin users
 * - Session-based authentication with 7-day expiry
 * - Prisma adapter for database integration
 * - Admin plugin for user management, session control, impersonation
 * - API Key plugin for kiosk/reader authentication with scopes
 * - Role-based access control (5 roles: Developer, Admin, Executive, Duty Watch, Quartermaster)
 * - RFID badge linkage for badge-based login
 *
 * @see https://better-auth.com/docs
 */

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

  // User model with additional fields
  user: {
    additionalFields: {
      // Role-based access control (5-level hierarchy)
      role: {
        type: 'string',
        required: true,
        defaultValue: 'quartermaster', // Lowest privilege by default
        input: true, // Allow setting on user creation
      },
      // RFID badge linkage for badge-based login
      badgeId: {
        type: 'string',
        required: false,
        unique: true, // One badge per user
        input: true, // Allow setting via admin panel
      },
    },
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

  // Plugins
  plugins: [
    // Admin plugin: User management, session control, impersonation
    admin({
      impersonationSessionDuration: 60 * 60, // 1 hour impersonation sessions
    }),
    // API Key plugin: Kiosk/reader authentication with scopes
    apiKey(),
  ],

  // Security options
  advanced: {
    generateId: () => {
      // Use randomUUID() for ID generation
      return randomUUID()
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
