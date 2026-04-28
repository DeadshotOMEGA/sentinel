import { initContract } from '@ts-rest/core'
import {
  PreflightLoginSchema,
  PreflightLoginResponseSchema,
  LoginRequestWithRemoteSystemSchema,
  LoginResponseSchema,
  SessionResponseSchema,
  ChangePinSchema,
  SetPinSchema,
  SetupPinSchema,
  AuthMessageSchema,
  AuthErrorSchema,
  HeartbeatResponseSchema,
} from '../schemas/auth.schema.js'

const c = initContract()

/**
 * Auth API contract — badge/service number + PIN authentication
 */
export const authContract = c.router({
  preflightLogin: {
    method: 'POST',
    path: '/api/auth/preflight-login',
    body: PreflightLoginSchema,
    responses: {
      200: PreflightLoginResponseSchema,
      400: AuthErrorSchema,
      401: AuthErrorSchema,
      429: AuthErrorSchema,
      500: AuthErrorSchema,
    },
    summary: 'Check login state before PIN entry',
    description:
      'Validate a badge serial number or Service Number and report whether the member can continue to PIN entry or must first create a replacement PIN.',
  },

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
    summary: 'Login with badge serial or Service Number + PIN',
    description:
      'Authenticate a member using their NFC badge serial number or Service Number and 4-digit PIN, then associate the session to a managed remote system (or kiosk auto-mode).',
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

  changePin: {
    method: 'POST',
    path: '/api/auth/change-pin',
    body: ChangePinSchema,
    responses: {
      200: AuthMessageSchema,
      400: AuthErrorSchema,
      401: AuthErrorSchema,
      403: AuthErrorSchema,
      500: AuthErrorSchema,
    },
    summary: 'Change own PIN',
    description: 'Authenticated member changes their own PIN',
  },

  setPin: {
    method: 'POST',
    path: '/api/auth/set-pin',
    body: SetPinSchema,
    responses: {
      200: AuthMessageSchema,
      400: AuthErrorSchema,
      401: AuthErrorSchema,
      403: AuthErrorSchema,
      404: AuthErrorSchema,
      500: AuthErrorSchema,
    },
    summary: 'Admin set member PIN',
    description: 'Admin sets or resets a member PIN (requires account level 5+)',
  },

  setupPin: {
    method: 'POST',
    path: '/api/auth/setup-pin',
    body: SetupPinSchema,
    responses: {
      200: AuthMessageSchema,
      400: AuthErrorSchema,
      401: AuthErrorSchema,
      403: AuthErrorSchema,
      429: AuthErrorSchema,
      500: AuthErrorSchema,
    },
    summary: 'Create a first or replacement PIN after login preflight',
    description:
      'Allow a member with a missing or temporary default PIN to create a secure 4-digit PIN before normal sign-in.',
  },
})
