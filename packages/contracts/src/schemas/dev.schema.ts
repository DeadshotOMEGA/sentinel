import * as v from 'valibot'

/**
 * Dev Mode Schemas
 *
 * Valibot schemas for development mode endpoints
 * These routes are disabled in production
 */

// ============================================================================
// Request Schemas
// ============================================================================

/**
 * Mock RFID scan request
 */
export const MockScanRequestSchema = v.object({
  serialNumber: v.pipe(v.string(), v.minLength(1)),
  timestamp: v.optional(v.pipe(v.string(), v.isoTimestamp())),
  kioskId: v.optional(v.string(), 'dev-mock-scanner'),
})

export type MockScanRequest = v.InferOutput<typeof MockScanRequestSchema>

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * Member with badge and presence info
 */
export const DevMemberSchema = v.object({
  id: v.string(),
  firstName: v.string(),
  lastName: v.string(),
  rank: v.string(),
  division: v.string(),
  divisionId: v.string(),
  mess: v.nullable(v.string()),
  badgeSerialNumber: v.nullable(v.string()),
  isPresent: v.boolean(),
})

export type DevMember = v.InferOutput<typeof DevMemberSchema>

/**
 * Dev members list response
 */
export const DevMembersResponseSchema = v.object({
  members: v.array(DevMemberSchema),
})

export type DevMembersResponse = v.InferOutput<typeof DevMembersResponseSchema>

/**
 * Clear all checkins response
 */
export const ClearCheckinsResponseSchema = v.object({
  message: v.string(),
  clearedCount: v.number(),
})

export type ClearCheckinsResponse = v.InferOutput<typeof ClearCheckinsResponseSchema>

/**
 * Mock scan response - member info
 */
export const MockScanMemberInfoSchema = v.object({
  id: v.string(),
  firstName: v.string(),
  lastName: v.string(),
  rank: v.string(),
  division: v.string(),
})

export type MockScanMemberInfo = v.InferOutput<typeof MockScanMemberInfoSchema>

/**
 * Mock scan response
 */
export const MockScanResponseSchema = v.object({
  success: v.boolean(),
  direction: v.picklist(['in', 'out']),
  member: MockScanMemberInfoSchema,
  timestamp: v.string(),
  message: v.string(),
})

export type MockScanResponse = v.InferOutput<typeof MockScanResponseSchema>

/**
 * Set building status request
 */
export const SetBuildingStatusRequestSchema = v.object({
  buildingStatus: v.picklist(['secured', 'open', 'locking_up']),
})

export type SetBuildingStatusRequest = v.InferOutput<typeof SetBuildingStatusRequestSchema>

/**
 * Set building status response
 */
export const SetBuildingStatusResponseSchema = v.object({
  message: v.string(),
  buildingStatus: v.picklist(['secured', 'open', 'locking_up']),
})

export type SetBuildingStatusResponse = v.InferOutput<typeof SetBuildingStatusResponseSchema>

/**
 * Error response schema
 */
export const DevErrorResponseSchema = v.object({
  error: v.string(),
  message: v.string(),
})

export type DevErrorResponse = v.InferOutput<typeof DevErrorResponseSchema>
