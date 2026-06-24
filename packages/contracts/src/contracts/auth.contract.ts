import { initContract } from '@ts-rest/core'
import {
  LoginRequestWithRemoteSystemSchema,
  LoginResponseSchema,
  SessionResponseSchema,
  AuthMessageSchema,
  AuthErrorSchema,
  HeartbeatResponseSchema,
} from '../schemas/auth.schema.js'

const c = initContract()

/**
 * Auth API contract — badge/service number authentication
 */
export const authContract = c.router({
  login: {
    method: 'POST',
    path: '/api/auth/login',
    body: LoginRequestWithRemoteSystemSchema,
    responses: {
      200: LoginResponseSchema,
      400: AuthErrorSchema,
      401: AuthErrorSchema,
      403: AuthErrorSchema,
      429: AuthErrorSchema,
      500: AuthErrorSchema,
    },
    summary: 'Login with badge serial or Service Number',
    description:
      'Authenticate a member using their NFC badge serial number or Service Number, then associate the session to a managed remote system (or kiosk auto-mode).',
  },

  logout: {
    method: 'POST',
    path: '/api/auth/logout',
    body: c.type<undefined>(),
    responses: {
      200: AuthMessageSchema,
      401: AuthErrorSchema,
      500: AuthErrorSchema,
    },
    summary: 'Logout and destroy session',
    description: 'Invalidate current session token',
  },

  getSession: {
    method: 'GET',
    path: '/api/auth/session',
    responses: {
      200: SessionResponseSchema,
      401: AuthErrorSchema,
      500: AuthErrorSchema,
    },
    summary: 'Get current session',
    description: 'Return the authenticated member info for the current session',
  },

  heartbeat: {
    method: 'POST',
    path: '/api/auth/heartbeat',
    body: c.type<undefined>(),
    responses: {
      200: HeartbeatResponseSchema,
      401: AuthErrorSchema,
      500: AuthErrorSchema,
    },
    summary: 'Refresh current session activity',
    description:
      'Record activity for the authenticated session and return updated session metadata.',
  },
})
