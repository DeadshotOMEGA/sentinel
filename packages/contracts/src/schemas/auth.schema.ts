import * as v from 'valibot'

/**
 * Login request — badge serial + 4-digit PIN
 */
export const LoginRequestSchema = v.object({
  serialNumber: v.pipe(
    v.string('Badge serial number is required'),
    v.minLength(1, 'Badge serial number must not be empty')
  ),
  pin: v.pipe(
    v.string('PIN is required'),
    v.regex(/^\d{4}$/, 'PIN must be exactly 4 digits')
  ),
})

export type LoginRequest = v.InferOutput<typeof LoginRequestSchema>

/**
 * Authenticated member info returned in login and session responses
 */
export const AuthMemberSchema = v.object({
  id: v.string(),
  firstName: v.string(),
  lastName: v.string(),
  rank: v.string(),
  serviceNumber: v.string(),
  accountLevel: v.number(),
})

export type AuthMember = v.InferOutput<typeof AuthMemberSchema>

/**
 * Login response
 */
export const LoginResponseSchema = v.object({
  token: v.string(),
  member: AuthMemberSchema,
})

export type LoginResponse = v.InferOutput<typeof LoginResponseSchema>

/**
 * Session response (GET /api/auth/session)
 */
export const SessionResponseSchema = v.object({
  member: AuthMemberSchema,
  expiresAt: v.string(),
})

export type SessionResponse = v.InferOutput<typeof SessionResponseSchema>

/**
 * Change PIN — authenticated member changes their own PIN
 */
export const ChangePinSchema = v.object({
  oldPin: v.pipe(
    v.string('Current PIN is required'),
    v.regex(/^\d{4}$/, 'PIN must be exactly 4 digits')
  ),
  newPin: v.pipe(
    v.string('New PIN is required'),
    v.regex(/^\d{4}$/, 'PIN must be exactly 4 digits')
  ),
})

export type ChangePinInput = v.InferOutput<typeof ChangePinSchema>

/**
 * Set PIN — admin sets a member's PIN
 */
export const SetPinSchema = v.object({
  memberId: v.pipe(v.string('Member ID is required'), v.uuid('Invalid member ID')),
  newPin: v.pipe(
    v.string('New PIN is required'),
    v.regex(/^\d{4}$/, 'PIN must be exactly 4 digits')
  ),
})

export type SetPinInput = v.InferOutput<typeof SetPinSchema>

/**
 * Generic success message
 */
export const AuthMessageSchema = v.object({
  message: v.string(),
})

/**
 * Error response
 */
export const AuthErrorSchema = v.object({
  error: v.string(),
  message: v.string(),
})
