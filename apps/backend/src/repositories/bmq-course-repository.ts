import type { PrismaClient } from "@sentinel/database";
import { prisma as defaultPrisma, Prisma } from "@sentinel/database";

/**
 * Repository for BMQ Course operations
 *
 * Manages Basic Military Qualification courses and member enrollments
 */
export class BmqCourseRepository {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma;
  }

  /**
   * Find all BMQ courses with optional active filter
   */
  async findAll(activeFilter?: boolean) {
    const where: Prisma.BmqCourseWhereInput = {};

    if (activeFilter !== undefined) {
      where.isActive = activeFilter;
    }

    return await this.prisma.bmqCourse.findMany({
      where,
      orderBy: { startDate: "desc" },
      include: {
        _count: {
          select: { bmqEnrollments: true },
        },
      },
    });
  }

  /**
   * Find BMQ course by ID
   */
  async findById(id: string) {
    return await this.prisma.bmqCourse.findUnique({
      where: { id },
      include: {
        _count: {
          select: { bmqEnrollments: true },
        },
      },
    });
  }

  /**
   * Create new BMQ course
   */
  async create(data: Prisma.BmqCourseCreateInput) {
    return await this.prisma.bmqCourse.create({
      data,
    });
  }

  /**
   * Update BMQ course
   */
  async update(id: string, data: Prisma.BmqCourseUpdateInput) {
    return await this.prisma.bmqCourse.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete BMQ course (cascades to enrollments)
   */
  async delete(id: string): Promise<number> {
    // Get enrollment count before deletion
    const course = await this.prisma.bmqCourse.findUnique({
      where: { id },
      include: {
        _count: {
          select: { bmqEnrollments: true },
        },
      },
    });

    const enrollmentCount = course?._count.bmqEnrollments || 0;

    await this.prisma.bmqCourse.delete({
      where: { id },
    });

    return enrollmentCount;
  }

  /**
   * Get enrollments for a course with member details
   */
  async findCourseEnrollments(courseId: string) {
    return await this.prisma.bmqEnrollment.findMany({
      where: { bmqCourseId: courseId },
      include: {
        member: {
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
      orderBy: [
        { member: { lastName: "asc" } },
        { member: { firstName: "asc" } },
      ],
    });
  }

  /**
   * Get enrollments for a member with course details
   */
  async findMemberEnrollments(memberId: string) {
    return await this.prisma.bmqEnrollment.findMany({
      where: { memberId },
      include: {
        bmqCourse: true,
      },
      orderBy: { bmqCourse: { startDate: "desc" } },
    });
  }

  /**
   * Create enrollment for a member in a course
   */
  async createEnrollment(courseId: string, memberId: string) {
    return await this.prisma.bmqEnrollment.create({
      data: {
        bmqCourseId: courseId,
        memberId,
        status: "enrolled",
      },
    });
  }

  /**
   * Update enrollment status
   */
  async updateEnrollment(
    id: string,
    status: string,
    completedAt?: string | null,
  ) {
    return await this.prisma.bmqEnrollment.update({
      where: { id },
      data: {
        status,
        completedAt: completedAt ? new Date(completedAt) : null,
      },
    });
  }

  /**
   * Delete enrollment
   */
  async deleteEnrollment(id: string): Promise<void> {
    await this.prisma.bmqEnrollment.delete({
      where: { id },
    });
  }

  /**
   * Find enrollment by ID
   */
  async findEnrollmentById(id: string) {
    return await this.prisma.bmqEnrollment.findUnique({
      where: { id },
    });
  }

  /**
   * Check if enrollment already exists
   */
  async findExistingEnrollment(courseId: string, memberId: string) {
    return await this.prisma.bmqEnrollment.findUnique({
      where: {
        memberId_bmqCourseId: {
          memberId,
          bmqCourseId: courseId,
        },
      },
    });
  }
}
