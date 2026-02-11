import { initContract } from '@ts-rest/core'
import {
  LoginRequestSchema,
  LoginResponseSchema,
  SessionResponseSchema,
  ChangePinSchema,
  SetPinSchema,
  AuthMessageSchema,
  AuthErrorSchema,
} from '../schemas/auth.schema.js'

const c = initContract()

/**
 * Auth API contract — badge+PIN authentication
 */
export const authContract = c.router({
  login: {
    method: 'POST',
    path: '/api/auth/login',
    body: LoginRequestSchema,
    responses: {
      200: LoginResponseSchema,
      401: AuthErrorSchema,
      429: AuthErrorSchema,
      500: AuthErrorSchema,
    },
    summary: 'Login with badge serial + PIN',
    description: 'Authenticate a member using their NFC badge serial number and 4-digit PIN',
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

  changePin: {
    method: 'POST',
    path: '/api/auth/change-pin',
    body: ChangePinSchema,
    responses: {
      200: AuthMessageSchema,
      401: AuthErrorSchema,
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
      401: AuthErrorSchema,
      403: AuthErrorSchema,
      500: AuthErrorSchema,
    },
    summary: 'Admin set member PIN',
    description: 'Admin sets or resets a member PIN (requires account level 5+)',
  },
})
