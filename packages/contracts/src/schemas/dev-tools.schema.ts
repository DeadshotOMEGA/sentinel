import * as v from 'valibot'

/**
 * Dev Tools Schemas
 *
 * Valibot schemas for development and testing tools endpoints
 * All endpoints require admin authentication
 */

// ============================================================================
// Enums
// ============================================================================

export const ClearableTableEnum = v.picklist([
  'members',
  'checkins',
  'visitors',
  'badges',
  'events',
  'event_attendees',
  'event_checkins',
])

export type ClearableTable = v.InferOutput<typeof ClearableTableEnum>

// ============================================================================
// Request Schemas
// ============================================================================

/**
 * Clear specific table request
 */
export const ClearTableRequestSchema = v.object({
  table: ClearableTableEnum,
})

export type ClearTableRequest = v.InferOutput<typeof ClearTableRequestSchema>

/**
 * Simulation configuration request
 */
export const SimulationRequestSchema = v.object({
  startDate: v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}$/)),
  endDate: v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}$/)),
  attendanceRate: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0.7),
  intensity: v.optional(
    v.picklist(['low', 'medium', 'high']),
    'medium'
  ),
})

export type SimulationRequest = v.InferOutput<typeof SimulationRequestSchema>

/**
 * Backdate members request
 */
export const BackdateMembersRequestSchema = v.object({
  targetDate: v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}$/)),
})

export type BackdateMembersRequest = v.InferOutput<typeof BackdateMembersRequestSchema>

/**
 * Seed scenario request
 */
export const SeedScenarioRequestSchema = v.object({
  scenario: v.picklist([
    'empty',
    'minimal',
    'standard',
    'realistic',
    'stress_test',
  ]),
})

export type SeedScenarioRequest = v.InferOutput<typeof SeedScenarioRequestSchema>

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * Clear all response
 */
export const ClearAllResponseSchema = v.object({
  cleared: v.array(v.string()),
})

export type ClearAllResponse = v.InferOutput<typeof ClearAllResponseSchema>

/**
 * Clear table response
 */
export const ClearTableResponseSchema = v.object({
  table: v.string(),
  count: v.number(),
})

export type ClearTableResponse = v.InferOutput<typeof ClearTableResponseSchema>

/**
 * Reset response
 */
export const ResetResponseSchema = v.object({
  cleared: v.array(v.string()),
  resetServices: v.array(v.string()),
})

export type ResetResponse = v.InferOutput<typeof ResetResponseSchema>

/**
 * Simulation defaults response
 */
export const SimulationDefaultsResponseSchema = v.object({
  attendanceRate: v.number(),
  intensity: v.string(),
  suggestedStartDate: v.string(),
  suggestedEndDate: v.string(),
})

export type SimulationDefaultsResponse = v.InferOutput<
  typeof SimulationDefaultsResponseSchema
>

/**
 * Simulation precheck response
 */
export const SimulationPrecheckResponseSchema = v.object({
  valid: v.boolean(),
  warnings: v.array(v.string()),
  estimatedCheckins: v.number(),
  estimatedDuration: v.number(),
})

export type SimulationPrecheckResponse = v.InferOutput<
  typeof SimulationPrecheckResponseSchema
>

/**
 * Simulation response
 */
export const SimulationResponseSchema = v.object({
  checkinsCreated: v.number(),
  membersAffected: v.number(),
  durationMs: v.number(),
})

export type SimulationResponse = v.InferOutput<typeof SimulationResponseSchema>

/**
 * Backdate members response
 */
export const BackdateMembersResponseSchema = v.object({
  updated: v.number(),
  targetDate: v.string(),
})

export type BackdateMembersResponse = v.InferOutput<typeof BackdateMembersResponseSchema>

/**
 * Scenario metadata
 */
export const ScenarioMetadataSchema = v.object({
  id: v.string(),
  name: v.string(),
  description: v.string(),
  estimatedTime: v.string(),
})

export type ScenarioMetadata = v.InferOutput<typeof ScenarioMetadataSchema>

/**
 * Scenarios list response
 */
export const ScenariosListResponseSchema = v.object({
  scenarios: v.array(ScenarioMetadataSchema),
})

export type ScenariosListResponse = v.InferOutput<typeof ScenariosListResponseSchema>

/**
 * Seed scenario response
 */
export const SeedScenarioResponseSchema = v.object({
  scenario: v.string(),
  created: v.object({
    members: v.number(),
    divisions: v.number(),
    badges: v.number(),
    checkins: v.number(),
    events: v.number(),
  }),
  durationMs: v.number(),
})

export type SeedScenarioResponse = v.InferOutput<typeof SeedScenarioResponseSchema>

/**
 * Error response schema
 */
export const DevToolsErrorResponseSchema = v.object({
  error: v.string(),
  message: v.string(),
})

export type DevToolsErrorResponse = v.InferOutput<typeof DevToolsErrorResponseSchema>
