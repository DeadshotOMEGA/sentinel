import * as v from 'valibot'

/**
 * Login request — badge/service number identity plus remote system selection.
 */
export const LoginRequestSchema = v.object({
  serialNumber: v.pipe(
    v.string('Badge or Service Number is required'),
    v.minLength(1, 'Badge or Service Number must not be empty')
  ),
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
