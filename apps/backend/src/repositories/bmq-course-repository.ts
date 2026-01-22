import type { PrismaClient } from '@sentinel/database'
import { prisma as defaultPrisma, Prisma } from '@sentinel/database'

/**
 * Repository for BMQ Course operations
 *
 * Manages Basic Military Qualification courses and member enrollments
 */
export class BmqCourseRepository {
  private prisma: PrismaClient

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma
  }

  /**
   * Find all BMQ courses with optional active filter
   */
  async findAll(activeFilter?: boolean) {
    const where: Prisma.bmq_coursesWhereInput = {}

    if (activeFilter !== undefined) {
      where.is_active = activeFilter
    }

    return await this.prisma.bmq_courses.findMany({
      where,
      orderBy: { start_date: 'desc' },
      include: {
        _count: {
          select: { bmq_enrollments: true },
        },
      },
    })
  }

  /**
   * Find BMQ course by ID
   */
  async findById(id: string) {
    return await this.prisma.bmq_courses.findUnique({
      where: { id },
      include: {
        _count: {
          select: { bmq_enrollments: true },
        },
      },
    })
  }

  /**
   * Create new BMQ course
   */
  async create(data: Prisma.bmq_coursesCreateInput) {
    return await this.prisma.bmq_courses.create({
      data,
    })
  }

  /**
   * Update BMQ course
   */
  async update(id: string, data: Prisma.bmq_coursesUpdateInput) {
    return await this.prisma.bmq_courses.update({
      where: { id },
      data,
    })
  }

  /**
   * Delete BMQ course (cascades to enrollments)
   */
  async delete(id: string): Promise<number> {
    // Get enrollment count before deletion
    const course = await this.prisma.bmq_courses.findUnique({
      where: { id },
      include: {
        _count: {
          select: { bmq_enrollments: true },
        },
      },
    })

    const enrollmentCount = course?._count.bmq_enrollments || 0

    await this.prisma.bmq_courses.delete({
      where: { id },
    })

    return enrollmentCount
  }

  /**
   * Get enrollments for a course with member details
   */
  async findCourseEnrollments(courseId: string) {
    return await this.prisma.bmq_enrollments.findMany({
      where: { bmq_course_id: courseId },
      include: {
        members: {
          select: {
            id: true,
            serviceNumber: true,
            firstName: true,
            lastName: true,
            rank: true,
            divisionId: true,
          },
        },
      },
      orderBy: [{ members: { lastName: 'asc' } }, { members: { firstName: 'asc' } }],
    })
  }

  /**
   * Get enrollments for a member with course details
   */
  async findMemberEnrollments(memberId: string) {
    return await this.prisma.bmq_enrollments.findMany({
      where: { member_id: memberId },
      include: {
        bmq_courses: true,
      },
      orderBy: { bmq_courses: { start_date: 'desc' } },
    })
  }

  /**
   * Create enrollment for a member in a course
   */
  async createEnrollment(courseId: string, memberId: string) {
    return await this.prisma.bmq_enrollments.create({
      data: {
        bmq_course_id: courseId,
        member_id: memberId,
        status: 'enrolled',
      },
    })
  }

  /**
   * Update enrollment status
   */
  async updateEnrollment(
    id: string,
    status: string,
    completedAt?: string | null
  ) {
    return await this.prisma.bmq_enrollments.update({
      where: { id },
      data: {
        status,
        completed_at: completedAt ? new Date(completedAt) : null,
      },
    })
  }

  /**
   * Delete enrollment
   */
  async deleteEnrollment(id: string): Promise<void> {
    await this.prisma.bmq_enrollments.delete({
      where: { id },
    })
  }

  /**
   * Find enrollment by ID
   */
  async findEnrollmentById(id: string) {
    return await this.prisma.bmq_enrollments.findUnique({
      where: { id },
    })
  }

  /**
   * Check if enrollment already exists
   */
  async findExistingEnrollment(
    courseId: string,
    memberId: string
  ) {
    return await this.prisma.bmq_enrollments.findUnique({
      where: {
        member_id_bmq_course_id: {
          member_id: memberId,
          bmq_course_id: courseId,
        },
      },
    })
  }
}
