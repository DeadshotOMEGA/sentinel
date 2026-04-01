import * as v from 'valibot'

export const DISALLOWED_MEMBER_PINS = ['0000', '1111', '1234', '4321'] as const

function isAllowedMemberPin(value: string): boolean {
  return !DISALLOWED_MEMBER_PINS.includes(value as (typeof DISALLOWED_MEMBER_PINS)[number])
}

const SecureNewPinSchema = v.pipe(
  v.string('New PIN is required'),
  v.regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
  v.check(isAllowedMemberPin, 'Choose a less predictable PIN')
)

/**
 * Login request — badge serial + 4-digit PIN
 */
export const LoginRequestSchema = v.object({
  serialNumber: v.pipe(
    v.string('Badge serial number is required'),
    v.minLength(1, 'Badge serial number must not be empty')
  ),
  pin: v.pipe(v.string('PIN is required'), v.regex(/^\d{4}$/, 'PIN must be exactly 4 digits')),
  remoteSystemId: v.optional(
    v.pipe(v.string('Remote system is required'), v.uuid('Invalid remote system ID'))
  ),
  useKioskRemoteSystem: v.optional(v.boolean('Kiosk mode flag must be a boolean')),
})

export const LoginRequestWithRemoteSystemSchema = v.pipe(
  LoginRequestSchema,
  v.check(
    ({ remoteSystemId, useKioskRemoteSystem }) =>
      useKioskRemoteSystem === true || typeof remoteSystemId === 'string',
    'Choose a managed remote system before signing in'
  )
)

export type LoginRequest = v.InferOutput<typeof LoginRequestWithRemoteSystemSchema>

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
  mustChangePin: v.boolean(),
})

export type AuthMember = v.InferOutput<typeof AuthMemberSchema>

export const SessionMetadataSchema = v.object({
  sessionId: v.string(),
  remoteSystemId: v.nullable(v.string()),
  remoteSystemName: v.string(),
  lastSeenAt: v.string(),
  expiresAt: v.string(),
})

export type SessionMetadata = v.InferOutput<typeof SessionMetadataSchema>

/**
 * Login response
 */
export const LoginResponseSchema = v.object({
  token: v.string(),
  member: AuthMemberSchema,
  sessionId: v.string(),
  remoteSystemId: v.nullable(v.string()),
  remoteSystemName: v.string(),
  lastSeenAt: v.string(),
  expiresAt: v.string(),
})

export type LoginResponse = v.InferOutput<typeof LoginResponseSchema>

/**
 * Session response (GET /api/auth/session)
 */
export const SessionResponseSchema = v.object({
  member: AuthMemberSchema,
  sessionId: v.string(),
  remoteSystemId: v.nullable(v.string()),
  remoteSystemName: v.string(),
  lastSeenAt: v.string(),
  expiresAt: v.string(),
})

export type SessionResponse = v.InferOutput<typeof SessionResponseSchema>

export const HeartbeatResponseSchema = SessionMetadataSchema

export type HeartbeatResponse = v.InferOutput<typeof HeartbeatResponseSchema>

/**
 * Change PIN — authenticated member changes their own PIN
 */
export const ChangePinSchema = v.object({
  oldPin: v.optional(
    v.pipe(
      v.string('Current PIN must be exactly 4 digits'),
      v.regex(/^\d{4}$/, 'PIN must be exactly 4 digits')
    )
  ),
  newPin: SecureNewPinSchema,
})

export type ChangePinInput = v.InferOutput<typeof ChangePinSchema>

/**
 * Set PIN — admin sets a member's PIN
 */
export const SetPinSchema = v.object({
  memberId: v.pipe(v.string('Member ID is required'), v.uuid('Invalid member ID')),
  newPin: SecureNewPinSchema,
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
