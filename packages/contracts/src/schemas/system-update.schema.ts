import * as v from 'valibot'

const VERSION_TAG_PATTERN = /^v[0-9]+\.[0-9]+\.[0-9]+$/
const JOB_ID_PATTERN = /^system-update-[0-9]{13}-[0-9a-f-]{36}$/

export const SystemUpdateVersionSchema = v.pipe(
  v.string('Version is required'),
  v.regex(VERSION_TAG_PATTERN, 'Version must be in vX.Y.Z format')
)

export const SystemUpdateJobIdSchema = v.pipe(
  v.string('Job ID is required'),
  v.regex(JOB_ID_PATTERN, 'Invalid update job ID format')
)

export const SystemUpdateJobStatusValues = [
  'idle',
  'requested',
  'authorized',
  'staging',
  'downloading',
  'verifying',
  'installing',
  'post_install',
  'restarting',
  'health_check',
  'completed',
  'failed',
  'rollback_attempted',
  'rolled_back',
] as const

export const SystemUpdateJobStatusSchema = v.picklist(
  SystemUpdateJobStatusValues,
  'Choose a valid system update job status'
)

const NullableVersionSchema = v.nullable(SystemUpdateVersionSchema)

export const SystemUpdateRequestedBySchema = v.object({
  memberId: v.string(),
  memberName: v.string(),
  accountLevel: v.nullable(v.number()),
  fromIp: v.nullable(v.string()),
})

export const SystemUpdateJobSchema = v.object({
  jobId: SystemUpdateJobIdSchema,
  status: SystemUpdateJobStatusSchema,
  step: SystemUpdateJobStatusSchema,
  message: v.string(),
  requestedAt: v.string(),
  startedAt: v.nullable(v.string()),
  finishedAt: v.nullable(v.string()),
  currentVersion: NullableVersionSchema,
  latestVersion: NullableVersionSchema,
  targetVersion: SystemUpdateVersionSchema,
  failureSummary: v.nullable(v.string()),
  rollbackAttempted: v.boolean(),
  requestedBy: SystemUpdateRequestedBySchema,
})

export const SystemUpdateStatusResponseSchema = v.object({
  currentVersion: NullableVersionSchema,
  latestVersion: NullableVersionSchema,
  latestReleaseUrl: v.nullable(v.string()),
  updateAvailable: v.boolean(),
  currentJob: v.nullable(SystemUpdateJobSchema),
})

export const SystemUpdateTraceResponseSchema = v.object({
  available: v.boolean(),
  path: v.string(),
  content: v.string(),
  lastModifiedAt: v.nullable(v.string()),
})

export const StartSystemUpdateSchema = v.object({
  targetVersion: SystemUpdateVersionSchema,
})

export const StartSystemUpdateResponseSchema = v.object({
  success: v.boolean(),
  message: v.string(),
  job: SystemUpdateJobSchema,
})

export const SystemUpdateJobParamsSchema = v.object({
  jobId: SystemUpdateJobIdSchema,
})

export type SystemUpdateVersion = v.InferOutput<typeof SystemUpdateVersionSchema>
export type SystemUpdateJobStatus = v.InferOutput<typeof SystemUpdateJobStatusSchema>
export type SystemUpdateRequestedBy = v.InferOutput<typeof SystemUpdateRequestedBySchema>
export type SystemUpdateJob = v.InferOutput<typeof SystemUpdateJobSchema>
export type SystemUpdateStatusResponse = v.InferOutput<typeof SystemUpdateStatusResponseSchema>
export type SystemUpdateTraceResponse = v.InferOutput<typeof SystemUpdateTraceResponseSchema>
export type StartSystemUpdateInput = v.InferOutput<typeof StartSystemUpdateSchema>
export type StartSystemUpdateResponse = v.InferOutput<typeof StartSystemUpdateResponseSchema>
export type SystemUpdateJobParams = v.InferOutput<typeof SystemUpdateJobParamsSchema>
