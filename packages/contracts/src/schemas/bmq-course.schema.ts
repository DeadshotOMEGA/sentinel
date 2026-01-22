import * as v from 'valibot'

/**
 * Day of week enum
 */
export const DayOfWeekEnum = v.picklist(
  ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
  'Invalid day of week'
)
export type DayOfWeek = v.InferOutput<typeof DayOfWeekEnum>

/**
 * BMQ enrollment status enum
 */
export const BMQEnrollmentStatusEnum = v.picklist(
  ['enrolled', 'completed', 'withdrawn'],
  'Invalid enrollment status'
)
export type BMQEnrollmentStatus = v.InferOutput<typeof BMQEnrollmentStatusEnum>

/**
 * BMQ course response schema
 */
export const BMQCourseResponseSchema = v.object({
  id: v.string(),
  name: v.string(),
  startDate: v.string(), // ISO date
  endDate: v.string(), // ISO date
  trainingDays: v.array(DayOfWeekEnum),
  trainingStartTime: v.string(), // HH:MM format
  trainingEndTime: v.string(), // HH:MM format
  isActive: v.boolean(),
  createdAt: v.string(), // ISO timestamp
  updatedAt: v.string(), // ISO timestamp
  enrollmentCount: v.optional(v.number(), 0), // Count of enrolled members
})
export type BMQCourseResponse = v.InferOutput<typeof BMQCourseResponseSchema>

/**
 * BMQ course list response schema
 */
export const BMQCourseListResponseSchema = v.object({
  courses: v.array(BMQCourseResponseSchema),
})
export type BMQCourseListResponse = v.InferOutput<typeof BMQCourseListResponseSchema>

/**
 * Create BMQ course schema
 */
export const CreateBMQCourseSchema = v.pipe(
  v.object({
    name: v.pipe(
      v.string('Course name is required'),
      v.minLength(1, 'Course name cannot be empty'),
      v.maxLength(100, 'Course name must be at most 100 characters')
    ),
    startDate: v.pipe(
      v.string('Start date is required'),
      v.regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    ),
    endDate: v.pipe(
      v.string('End date is required'),
      v.regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    ),
    trainingDays: v.pipe(
      v.array(DayOfWeekEnum, 'Training days must be an array'),
      v.minLength(1, 'At least one training day is required')
    ),
    trainingStartTime: v.pipe(
      v.string('Training start time is required'),
      v.regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)')
    ),
    trainingEndTime: v.pipe(
      v.string('Training end time is required'),
      v.regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)')
    ),
    isActive: v.optional(v.boolean(), true),
  }),
  v.check(
    (data) => new Date(data.startDate) < new Date(data.endDate),
    'Start date must be before end date'
  ),
  v.check(
    (data) => data.trainingStartTime < data.trainingEndTime,
    'Training start time must be before end time'
  )
)
export type CreateBMQCourse = v.InferOutput<typeof CreateBMQCourseSchema>

/**
 * Update BMQ course schema
 */
export const UpdateBMQCourseSchema = v.pipe(
  v.object({
    name: v.optional(
      v.pipe(
        v.string(),
        v.minLength(1, 'Course name cannot be empty'),
        v.maxLength(100, 'Course name must be at most 100 characters')
      )
    ),
    startDate: v.optional(
      v.pipe(
        v.string(),
        v.regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
      )
    ),
    endDate: v.optional(
      v.pipe(
        v.string(),
        v.regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
      )
    ),
    trainingDays: v.optional(
      v.pipe(
        v.array(DayOfWeekEnum),
        v.minLength(1, 'At least one training day is required')
      )
    ),
    trainingStartTime: v.optional(
      v.pipe(
        v.string(),
        v.regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)')
      )
    ),
    trainingEndTime: v.optional(
      v.pipe(
        v.string(),
        v.regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)')
      )
    ),
    isActive: v.optional(v.boolean()),
  }),
  v.check(
    (data) => {
      // Only validate dates if both are present
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) < new Date(data.endDate)
      }
      return true
    },
    'Start date must be before end date'
  ),
  v.check(
    (data) => {
      // Only validate times if both are present
      if (data.trainingStartTime && data.trainingEndTime) {
        return data.trainingStartTime < data.trainingEndTime
      }
      return true
    },
    'Training start time must be before end time'
  )
)
export type UpdateBMQCourse = v.InferOutput<typeof UpdateBMQCourseSchema>

/**
 * BMQ enrollment response schema
 */
export const BMQEnrollmentResponseSchema = v.object({
  id: v.string(),
  memberId: v.string(),
  bmqCourseId: v.string(),
  enrolledAt: v.string(), // ISO timestamp
  completedAt: v.nullable(v.string()), // ISO date or null
  status: BMQEnrollmentStatusEnum,
})
export type BMQEnrollmentResponse = v.InferOutput<typeof BMQEnrollmentResponseSchema>

/**
 * Member info in enrollment response
 */
export const BMQEnrollmentMemberInfoSchema = v.object({
  id: v.string(),
  serviceNumber: v.string(),
  firstName: v.string(),
  lastName: v.string(),
  rank: v.string(),
  divisionId: v.nullable(v.string()),
})
export type BMQEnrollmentMemberInfo = v.InferOutput<typeof BMQEnrollmentMemberInfoSchema>

/**
 * BMQ enrollment with member info
 */
export const BMQEnrollmentWithMemberSchema = v.object({
  id: v.string(),
  memberId: v.string(),
  bmqCourseId: v.string(),
  enrolledAt: v.string(),
  completedAt: v.nullable(v.string()),
  status: BMQEnrollmentStatusEnum,
  member: BMQEnrollmentMemberInfoSchema,
})
export type BMQEnrollmentWithMember = v.InferOutput<typeof BMQEnrollmentWithMemberSchema>

/**
 * BMQ enrollment list response
 */
export const BMQEnrollmentListResponseSchema = v.object({
  enrollments: v.array(BMQEnrollmentWithMemberSchema),
})
export type BMQEnrollmentListResponse = v.InferOutput<typeof BMQEnrollmentListResponseSchema>

/**
 * BMQ enrollment with course info
 */
export const BMQEnrollmentWithCourseSchema = v.object({
  id: v.string(),
  memberId: v.string(),
  bmqCourseId: v.string(),
  enrolledAt: v.string(),
  completedAt: v.nullable(v.string()),
  status: BMQEnrollmentStatusEnum,
  course: BMQCourseResponseSchema,
})
export type BMQEnrollmentWithCourse = v.InferOutput<typeof BMQEnrollmentWithCourseSchema>

/**
 * Member enrollment list response
 */
export const MemberEnrollmentListResponseSchema = v.object({
  enrollments: v.array(BMQEnrollmentWithCourseSchema),
})
export type MemberEnrollmentListResponse = v.InferOutput<typeof MemberEnrollmentListResponseSchema>

/**
 * Create enrollment schema
 */
export const CreateBMQEnrollmentSchema = v.object({
  memberId: v.pipe(v.string('Member ID is required'), v.uuid('Invalid member ID format')),
})
export type CreateBMQEnrollment = v.InferOutput<typeof CreateBMQEnrollmentSchema>

/**
 * Update enrollment schema
 */
export const UpdateBMQEnrollmentSchema = v.pipe(
  v.object({
    status: BMQEnrollmentStatusEnum,
    completedAt: v.optional(
      v.nullable(
        v.pipe(
          v.string(),
          v.regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
        )
      )
    ),
  }),
  v.check(
    (data) => {
      // If status is 'completed', completedAt is required
      if (data.status === 'completed' && !data.completedAt) {
        return false
      }
      return true
    },
    'Completed date is required when status is "completed"'
  )
)
export type UpdateBMQEnrollment = v.InferOutput<typeof UpdateBMQEnrollmentSchema>

/**
 * Query parameters for listing courses
 */
export const BMQCourseListQuerySchema = v.object({
  active: v.optional(v.picklist(['true', 'false'])),
})
export type BMQCourseListQuery = v.InferOutput<typeof BMQCourseListQuerySchema>

/**
 * Path parameter schemas
 */
export const BMQCourseIdParamSchema = v.object({
  id: v.pipe(v.string(), v.uuid('Invalid course ID format')),
})
export type BMQCourseIdParam = v.InferOutput<typeof BMQCourseIdParamSchema>

export const BMQEnrollmentIdParamSchema = v.object({
  id: v.pipe(v.string(), v.uuid('Invalid enrollment ID format')),
})
export type BMQEnrollmentIdParam = v.InferOutput<typeof BMQEnrollmentIdParamSchema>

export const BMQCourseEnrollmentParamsSchema = v.object({
  courseId: v.pipe(v.string(), v.uuid('Invalid course ID format')),
})
export type BMQCourseEnrollmentParams = v.InferOutput<typeof BMQCourseEnrollmentParamsSchema>

export const BMQMemberEnrollmentParamsSchema = v.object({
  memberId: v.pipe(v.string(), v.uuid('Invalid member ID format')),
})
export type BMQMemberEnrollmentParams = v.InferOutput<typeof BMQMemberEnrollmentParamsSchema>

/**
 * Delete course response schema
 */
export const DeleteBMQCourseResponseSchema = v.object({
  message: v.string(),
  enrollmentsDeleted: v.number(),
})
export type DeleteBMQCourseResponse = v.InferOutput<typeof DeleteBMQCourseResponseSchema>

/**
 * Generic error response schema
 */
export const BMQErrorResponseSchema = v.object({
  error: v.string(),
  message: v.string(),
})
export type BMQErrorResponse = v.InferOutput<typeof BMQErrorResponseSchema>
