import { initServer } from '@ts-rest/express'
import { bmqCourseContract } from '@sentinel/contracts'
import { BmqCourseRepository } from '../repositories/bmq-course-repository.js'
import { getPrismaClient } from '../lib/database.js'

const s = initServer()
const bmqRepo = new BmqCourseRepository(getPrismaClient())

/**
 * BMQ Courses routes
 *
 * Manages Basic Military Qualification (BMQ) courses and member enrollments.
 * Includes course CRUD operations and enrollment management.
 */
export const bmqCoursesRouter = s.router(bmqCourseContract, {
  /**
   * GET /api/bmq-courses - List all BMQ courses
   */
  listCourses: async ({ query }) => {
    try {
      const activeFilter =
        query.active === 'true' ? true : query.active === 'false' ? false : undefined

      const courses = await bmqRepo.findAll(activeFilter)

      return {
        status: 200 as const,
        body: {
          courses: courses.map((course: any) => toCourseApiFormat(course)),
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch BMQ courses',
        },
      }
    }
  },

  /**
   * GET /api/bmq-courses/:id - Get BMQ course by ID
   */
  getCourseById: async ({ params }) => {
    try {
      const course = await bmqRepo.findById(params.id)

      if (!course) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `BMQ course with ID '${params.id}' not found`,
          },
        }
      }

      return {
        status: 200 as const,
        body: {
          course: toCourseApiFormat(course as any),
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch BMQ course',
        },
      }
    }
  },

  /**
   * POST /api/bmq-courses - Create new BMQ course
   */
  createCourse: async ({ body }) => {
    try {
      const course = await bmqRepo.create({
        name: body.name,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        trainingDays: body.trainingDays,
        trainingStartTime: new Date(`1970-01-01T${body.trainingStartTime}:00Z`),
        trainingEndTime: new Date(`1970-01-01T${body.trainingEndTime}:00Z`),
        isActive: body.isActive ?? true,
      })

      return {
        status: 201 as const,
        body: {
          course: toCourseApiFormat(course as any),
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create BMQ course',
        },
      }
    }
  },

  /**
   * PUT /api/bmq-courses/:id - Update BMQ course
   */
  updateCourse: async ({ params, body }) => {
    try {
      // Check if course exists
      const existing = await bmqRepo.findById(params.id)
      if (!existing) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `BMQ course with ID '${params.id}' not found`,
          },
        }
      }

      // Build update data
      const updateData: any = {}
      if (body.name !== undefined) updateData.name = body.name
      if (body.startDate !== undefined) updateData.startDate = new Date(body.startDate)
      if (body.endDate !== undefined) updateData.endDate = new Date(body.endDate)
      if (body.trainingDays !== undefined) updateData.trainingDays = body.trainingDays
      if (body.trainingStartTime !== undefined)
        updateData.trainingStartTime = new Date(`1970-01-01T${body.trainingStartTime}:00Z`)
      if (body.trainingEndTime !== undefined)
        updateData.trainingEndTime = new Date(`1970-01-01T${body.trainingEndTime}:00Z`)
      if (body.isActive !== undefined) updateData.isActive = body.isActive

      // Check if there are any fields to update
      if (Object.keys(updateData).length === 0) {
        return {
          status: 400 as const,
          body: {
            error: 'VALIDATION_ERROR',
            message: 'No fields to update',
          },
        }
      }

      const course = await bmqRepo.update(params.id, updateData)

      return {
        status: 200 as const,
        body: {
          course: toCourseApiFormat(course as any),
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update BMQ course',
        },
      }
    }
  },

  /**
   * DELETE /api/bmq-courses/:id - Delete BMQ course
   */
  deleteCourse: async ({ params }) => {
    try {
      // Check if course exists
      const existing = await bmqRepo.findById(params.id)
      if (!existing) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `BMQ course with ID '${params.id}' not found`,
          },
        }
      }

      const enrollmentCount = await bmqRepo.delete(params.id)

      return {
        status: 200 as const,
        body: {
          message: 'BMQ course deleted successfully',
          enrollmentsDeleted: enrollmentCount,
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete BMQ course',
        },
      }
    }
  },

  /**
   * GET /api/bmq-courses/:courseId/enrollments - Get course enrollments
   */
  getCourseEnrollments: async ({ params }) => {
    try {
      // Check if course exists
      const course = await bmqRepo.findById(params.courseId)
      if (!course) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `BMQ course with ID '${params.courseId}' not found`,
          },
        }
      }

      const enrollments = await bmqRepo.findCourseEnrollments(params.courseId)

      return {
        status: 200 as const,
        body: {
          enrollments: enrollments.map((enrollment: any) =>
            toEnrollmentWithMemberApiFormat(enrollment)
          ),
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch enrollments',
        },
      }
    }
  },

  /**
   * POST /api/bmq-courses/:courseId/enrollments - Enroll member
   */
  enrollMember: async ({ params, body }) => {
    try {
      // Check if course exists
      const course = await bmqRepo.findById(params.courseId)
      if (!course) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `BMQ course with ID '${params.courseId}' not found`,
          },
        }
      }

      // Check if member exists
      const member = await getPrismaClient().member.findUnique({
        where: { id: body.memberId },
      })
      if (!member) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Member with ID '${body.memberId}' not found`,
          },
        }
      }

      // Check if already enrolled
      const existingEnrollment = await bmqRepo.findExistingEnrollment(
        params.courseId,
        body.memberId
      )
      if (existingEnrollment) {
        return {
          status: 409 as const,
          body: {
            error: 'CONFLICT',
            message: `Member is already enrolled in this BMQ course`,
          },
        }
      }

      const enrollment = await bmqRepo.createEnrollment(params.courseId, body.memberId)

      return {
        status: 201 as const,
        body: {
          enrollment: toEnrollmentApiFormat(enrollment),
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to enroll member',
        },
      }
    }
  },

  /**
   * PUT /api/bmq-courses/enrollments/:id - Update enrollment
   */
  updateEnrollment: async ({ params, body }) => {
    try {
      // Check if enrollment exists
      const existing = await bmqRepo.findEnrollmentById(params.id)
      if (!existing) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Enrollment with ID '${params.id}' not found`,
          },
        }
      }

      const enrollment = await bmqRepo.updateEnrollment(params.id, body.status, body.completedAt)

      return {
        status: 200 as const,
        body: {
          enrollment: toEnrollmentApiFormat(enrollment),
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update enrollment',
        },
      }
    }
  },

  /**
   * DELETE /api/bmq-courses/enrollments/:id - Delete enrollment
   */
  deleteEnrollment: async ({ params }) => {
    try {
      // Check if enrollment exists
      const existing = await bmqRepo.findEnrollmentById(params.id)
      if (!existing) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Enrollment with ID '${params.id}' not found`,
          },
        }
      }

      await bmqRepo.deleteEnrollment(params.id)

      return {
        status: 204 as const,
        body: undefined,
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete enrollment',
        },
      }
    }
  },

  /**
   * GET /api/bmq-courses/members/:memberId/enrollments - Get member enrollments
   */
  getMemberEnrollments: async ({ params }) => {
    try {
      // Check if member exists
      const member = await getPrismaClient().member.findUnique({
        where: { id: params.memberId },
      })
      if (!member) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Member with ID '${params.memberId}' not found`,
          },
        }
      }

      const enrollments = await bmqRepo.findMemberEnrollments(params.memberId)

      return {
        status: 200 as const,
        body: {
          enrollments: enrollments.map((enrollment: any) =>
            toEnrollmentWithCourseApiFormat(enrollment)
          ),
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch member enrollments',
        },
      }
    }
  },
})

/**
 * Convert BmqCourse to API response format
 */
function toCourseApiFormat(course: any) {
  return {
    id: course.id,
    name: course.name,
    startDate: course.startDate.toISOString().split('T')[0],
    endDate: course.endDate.toISOString().split('T')[0],
    trainingDays: course.trainingDays,
    trainingStartTime: formatTime(course.trainingStartTime),
    trainingEndTime: formatTime(course.trainingEndTime),
    isActive: course.isActive,
    createdAt: course.createdAt.toISOString(),
    updatedAt: course.updatedAt.toISOString(),
    enrollmentCount: course._count?.bmqEnrollments || 0,
  }
}

/**
 * Convert BmqEnrollment to API response format
 */
function toEnrollmentApiFormat(enrollment: any) {
  return {
    id: enrollment.id,
    memberId: enrollment.memberId,
    bmqCourseId: enrollment.bmqCourseId,
    enrolledAt: enrollment.enrolledAt.toISOString(),
    completedAt: enrollment.completedAt ? enrollment.completedAt.toISOString().split('T')[0] : null,
    status: enrollment.status,
  }
}

/**
 * Convert BmqEnrollment with member to API response format
 */
function toEnrollmentWithMemberApiFormat(enrollment: any) {
  return {
    id: enrollment.id,
    memberId: enrollment.memberId,
    bmqCourseId: enrollment.bmqCourseId,
    enrolledAt: enrollment.enrolledAt.toISOString(),
    completedAt: enrollment.completedAt ? enrollment.completedAt.toISOString().split('T')[0] : null,
    status: enrollment.status,
    member: {
      id: enrollment.member.id,
      serviceNumber: enrollment.member.serviceNumber,
      firstName: enrollment.member.firstName,
      lastName: enrollment.member.lastName,
      rank: enrollment.member.rank,
      divisionId: enrollment.member.divisionId,
    },
  }
}

/**
 * Convert BmqEnrollment with course to API response format
 */
function toEnrollmentWithCourseApiFormat(enrollment: any) {
  return {
    id: enrollment.id,
    memberId: enrollment.memberId,
    bmqCourseId: enrollment.bmqCourseId,
    enrolledAt: enrollment.enrolledAt.toISOString(),
    completedAt: enrollment.completedAt ? enrollment.completedAt.toISOString().split('T')[0] : null,
    status: enrollment.status,
    course: toCourseApiFormat(enrollment.bmqCourse),
  }
}

/**
 * Format time from Date to HH:MM
 */
function formatTime(date: Date): string {
  const hours = date.getUTCHours().toString().padStart(2, '0')
  const minutes = date.getUTCMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}
