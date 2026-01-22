import { initContract } from '@ts-rest/core'
import * as v from 'valibot'
import {
  BMQCourseResponseSchema,
  BMQCourseListResponseSchema,
  CreateBMQCourseSchema,
  UpdateBMQCourseSchema,
  BMQCourseListQuerySchema,
  BMQCourseIdParamSchema,
  DeleteBMQCourseResponseSchema,
  BMQEnrollmentResponseSchema,
  BMQEnrollmentListResponseSchema,
  MemberEnrollmentListResponseSchema,
  CreateBMQEnrollmentSchema,
  UpdateBMQEnrollmentSchema,
  BMQCourseEnrollmentParamsSchema,
  BMQEnrollmentIdParamSchema,
  BMQMemberEnrollmentParamsSchema,
  BMQErrorResponseSchema,
} from '../schemas/bmq-course.schema.js'

const c = initContract()

/**
 * BMQ Courses Contract
 *
 * Endpoints for managing Basic Military Qualification (BMQ) courses and enrollments:
 * - Course CRUD operations
 * - Member enrollment management
 * - Training schedule tracking
 */
export const bmqCourseContract = c.router(
  {
    // GET /api/bmq-courses - List all courses
    listCourses: {
      method: 'GET',
      path: '/api/bmq-courses',
      query: BMQCourseListQuerySchema,
      responses: {
        200: BMQCourseListResponseSchema,
        401: BMQErrorResponseSchema,
        500: BMQErrorResponseSchema,
      },
      summary: 'List all BMQ courses',
      description:
        'Get all BMQ courses with optional active filter. Includes enrollment count for each course.',
    },

    // GET /api/bmq-courses/members/:memberId/enrollments - Get member enrollments
    // IMPORTANT: This must be BEFORE /:id to prevent matching 'members' as an ID
    getMemberEnrollments: {
      method: 'GET',
      path: '/api/bmq-courses/members/:memberId/enrollments',
      pathParams: BMQMemberEnrollmentParamsSchema,
      responses: {
        200: MemberEnrollmentListResponseSchema,
        401: BMQErrorResponseSchema,
        404: BMQErrorResponseSchema,
        500: BMQErrorResponseSchema,
      },
      summary: 'Get member BMQ enrollments',
      description: 'Get all BMQ course enrollments for a specific member with course details',
    },

    // GET /api/bmq-courses/:id - Get course by ID
    getCourseById: {
      method: 'GET',
      path: '/api/bmq-courses/:id',
      pathParams: BMQCourseIdParamSchema,
      responses: {
        200: v.object({ course: BMQCourseResponseSchema }),
        401: BMQErrorResponseSchema,
        404: BMQErrorResponseSchema,
        500: BMQErrorResponseSchema,
      },
      summary: 'Get BMQ course by ID',
      description: 'Get a specific BMQ course by its unique identifier with enrollment count',
    },

    // POST /api/bmq-courses - Create new course
    createCourse: {
      method: 'POST',
      path: '/api/bmq-courses',
      body: CreateBMQCourseSchema,
      responses: {
        201: v.object({ course: BMQCourseResponseSchema }),
        400: BMQErrorResponseSchema,
        401: BMQErrorResponseSchema,
        403: BMQErrorResponseSchema,
        500: BMQErrorResponseSchema,
      },
      summary: 'Create BMQ course',
      description: 'Create a new BMQ course with training schedule. Admin role required.',
    },

    // PUT /api/bmq-courses/:id - Update course
    updateCourse: {
      method: 'PUT',
      path: '/api/bmq-courses/:id',
      pathParams: BMQCourseIdParamSchema,
      body: UpdateBMQCourseSchema,
      responses: {
        200: v.object({ course: BMQCourseResponseSchema }),
        400: BMQErrorResponseSchema,
        401: BMQErrorResponseSchema,
        403: BMQErrorResponseSchema,
        404: BMQErrorResponseSchema,
        500: BMQErrorResponseSchema,
      },
      summary: 'Update BMQ course',
      description: 'Update an existing BMQ course. Admin role required.',
    },

    // DELETE /api/bmq-courses/:id - Delete course
    deleteCourse: {
      method: 'DELETE',
      path: '/api/bmq-courses/:id',
      pathParams: BMQCourseIdParamSchema,
      body: c.type<undefined>(),
      responses: {
        200: DeleteBMQCourseResponseSchema,
        401: BMQErrorResponseSchema,
        403: BMQErrorResponseSchema,
        404: BMQErrorResponseSchema,
        500: BMQErrorResponseSchema,
      },
      summary: 'Delete BMQ course',
      description:
        'Delete a BMQ course and all associated enrollments. Admin role required.',
    },

    // GET /api/bmq-courses/:courseId/enrollments - Get course enrollments
    getCourseEnrollments: {
      method: 'GET',
      path: '/api/bmq-courses/:courseId/enrollments',
      pathParams: BMQCourseEnrollmentParamsSchema,
      responses: {
        200: BMQEnrollmentListResponseSchema,
        401: BMQErrorResponseSchema,
        404: BMQErrorResponseSchema,
        500: BMQErrorResponseSchema,
      },
      summary: 'Get course enrollments',
      description: 'Get all enrollments for a BMQ course with member details',
    },

    // POST /api/bmq-courses/:courseId/enrollments - Enroll member
    enrollMember: {
      method: 'POST',
      path: '/api/bmq-courses/:courseId/enrollments',
      pathParams: BMQCourseEnrollmentParamsSchema,
      body: CreateBMQEnrollmentSchema,
      responses: {
        201: v.object({ enrollment: BMQEnrollmentResponseSchema }),
        400: BMQErrorResponseSchema,
        401: BMQErrorResponseSchema,
        403: BMQErrorResponseSchema,
        404: BMQErrorResponseSchema,
        409: BMQErrorResponseSchema,
        500: BMQErrorResponseSchema,
      },
      summary: 'Enroll member in course',
      description:
        'Enroll a member in a BMQ course. Prevents duplicate enrollments. Admin role required.',
    },

    // PUT /api/bmq-courses/enrollments/:id - Update enrollment
    updateEnrollment: {
      method: 'PUT',
      path: '/api/bmq-courses/enrollments/:id',
      pathParams: BMQEnrollmentIdParamSchema,
      body: UpdateBMQEnrollmentSchema,
      responses: {
        200: v.object({ enrollment: BMQEnrollmentResponseSchema }),
        400: BMQErrorResponseSchema,
        401: BMQErrorResponseSchema,
        403: BMQErrorResponseSchema,
        404: BMQErrorResponseSchema,
        500: BMQErrorResponseSchema,
      },
      summary: 'Update enrollment status',
      description:
        'Update enrollment status (enrolled, completed, withdrawn). Requires completion date when marking completed. Admin role required.',
    },

    // DELETE /api/bmq-courses/enrollments/:id - Delete enrollment
    deleteEnrollment: {
      method: 'DELETE',
      path: '/api/bmq-courses/enrollments/:id',
      pathParams: BMQEnrollmentIdParamSchema,
      body: c.type<undefined>(),
      responses: {
        204: c.type<void>(),
        401: BMQErrorResponseSchema,
        403: BMQErrorResponseSchema,
        404: BMQErrorResponseSchema,
        500: BMQErrorResponseSchema,
      },
      summary: 'Delete enrollment',
      description: 'Remove a member enrollment from a BMQ course. Admin role required.',
    },
  },
  {
    pathPrefix: '',
  }
)
