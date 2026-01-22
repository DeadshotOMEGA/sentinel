import { initServer } from '@ts-rest/express'
import { reportContract } from '@sentinel/contracts'
import type {
  DailyCheckinConfig,
  TrainingNightReportConfig,
  BMQReportConfig,
  PersonnelRosterConfig,
  VisitorSummaryConfig,
} from '@sentinel/contracts'
import { getPrismaClient } from '../lib/database.js'

const s = initServer()
const prisma = getPrismaClient()

/**
 * Report generation routes
 *
 * Generates various attendance and personnel reports with complex aggregations
 */
export const reportsRouter = s.router(reportContract, {
  /**
   * POST /api/reports/daily-checkin - Generate daily check-in summary
   */
  generateDailyCheckin: async ({ body }) => {
    try {
      const config: DailyCheckinConfig = body
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Build where clause for member filtering
      const memberWhere: Record<string, unknown> = {
        status: 'active',
      }

      if (config.divisionId) {
        memberWhere.divisionId = config.divisionId
      }

      // Get present FT staff (members who checked in today)
      let presentFTStaff: Array<{
        id: string
        serviceNumber: string
        firstName: string
        lastName: string
        rank: string
        division: { id: string; name: string }
      }> = []
      let absentFTStaff: Array<{
        id: string
        serviceNumber: string
        firstName: string
        lastName: string
        rank: string
        division: { id: string; name: string }
      }> = []

      if (
        !config.memberType ||
        config.memberType === 'all' ||
        config.memberType === 'ft_staff'
      ) {
        // Present FT staff
        const presentFT = await prisma.member.findMany({
          where: {
            ...memberWhere,
            memberType: {
              in: ['class_b', 'class_c', 'reg_force'],
            },
            checkins: {
              some: {
                direction: 'in',
                timestamp: {
                  gte: today,
                },
              },
            },
          },
          include: {
            division: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: [{ division: { name: 'asc' } }, { rank: 'asc' }, { lastName: 'asc' }],
        })

        presentFTStaff = presentFT.map((m) => ({
          id: m.id,
          serviceNumber: m.serviceNumber,
          firstName: m.firstName,
          lastName: m.lastName,
          rank: m.rank,
          division: {
            id: m.division?.id ?? 'Unknown',
            name: m.division?.name ?? 'Unknown',
          },
        }))

        // Absent FT staff (no check-in today)
        const absentFT = await prisma.member.findMany({
          where: {
            ...memberWhere,
            memberType: {
              in: ['class_b', 'class_c', 'reg_force'],
            },
            NOT: {
              checkins: {
                some: {
                  direction: 'in',
                  timestamp: {
                    gte: today,
                  },
                },
              },
            },
          },
          include: {
            division: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: [{ division: { name: 'asc' } }, { rank: 'asc' }, { lastName: 'asc' }],
        })

        absentFTStaff = absentFT.map((m) => ({
          id: m.id,
          serviceNumber: m.serviceNumber,
          firstName: m.firstName,
          lastName: m.lastName,
          rank: m.rank,
          division: {
            id: m.division?.id ?? 'Unknown',
            name: m.division?.name ?? 'Unknown',
          },
        }))
      }

      // Get present reserve members
      let presentReserve: Array<{
        id: string
        serviceNumber: string
        firstName: string
        lastName: string
        rank: string
        division: { id: string; name: string }
      }> = []

      if (
        !config.memberType ||
        config.memberType === 'all' ||
        config.memberType === 'reserve'
      ) {
        const presentRes = await prisma.member.findMany({
          where: {
            ...memberWhere,
            memberType: 'class_a',
            checkins: {
              some: {
                direction: 'in',
                timestamp: {
                  gte: today,
                },
              },
            },
          },
          include: {
            division: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: [{ division: { name: 'asc' } }, { rank: 'asc' }, { lastName: 'asc' }],
        })

        presentReserve = presentRes.map((m) => ({
          id: m.id,
          serviceNumber: m.serviceNumber,
          firstName: m.firstName,
          lastName: m.lastName,
          rank: m.rank,
          division: {
            id: m.division?.id ?? 'Unknown',
            name: m.division?.name ?? 'Unknown',
          },
        }))
      }

      // Calculate summary by division
      const divisionSummary: Record<
        string,
        { name: string; ftStaff: number; reserve: number }
      > = {}

      for (const member of presentFTStaff) {
        const divisionId = member.division.id
        if (!divisionSummary[divisionId]) {
          divisionSummary[divisionId] = {
            name: member.division.name,
            ftStaff: 0,
            reserve: 0,
          }
        }
        const entry = divisionSummary[divisionId]
        if (entry) {
          entry.ftStaff++
        }
      }

      for (const member of presentReserve) {
        const divisionId = member.division.id
        if (!divisionSummary[divisionId]) {
          divisionSummary[divisionId] = {
            name: member.division.name,
            ftStaff: 0,
            reserve: 0,
          }
        }
        const entry = divisionSummary[divisionId]
        if (entry) {
          entry.reserve++
        }
      }

      return {
        status: 200 as const,
        body: {
          generatedAt: new Date().toISOString(),
          presentFTStaff,
          absentFTStaff,
          presentReserve,
          summary: {
            totalFTStaff: presentFTStaff.length,
            totalReserve: presentReserve.length,
            totalAbsentFTStaff: absentFTStaff.length,
            byDivision: Object.entries(divisionSummary).map(([id, data]) => ({
              divisionId: id,
              divisionName: data.name,
              ftStaff: data.ftStaff,
              reserve: data.reserve,
            })),
          },
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to generate daily check-in report',
        },
      }
    }
  },

  /**
   * POST /api/reports/training-night-attendance - Generate training night attendance report
   */
  generateTrainingNightAttendance: async ({ body }) => {
    try {
      const config: TrainingNightReportConfig = body

      // Calculate period dates based on config
      let periodStart: string = ''
      let periodEnd: string = ''

      if (config.period === 'custom' || (!config.period && config.periodStart && config.periodEnd)) {
        periodStart = config.periodStart ?? ''
        periodEnd = config.periodEnd ?? ''
      } else {
        // Get current training year
        const trainingYear = await prisma.trainingYear.findFirst({
          where: { isCurrent: true },
        })

        if (!trainingYear) {
          return {
            status: 404 as const,
            body: {
              error: 'NOT_FOUND',
              message: 'No current training year found',
            },
          }
        }

        const now = new Date()

        switch (config.period) {
          case 'current_year': {
            periodStart = trainingYear.startDate.toISOString().split('T')[0] ?? ''
            periodEnd = trainingYear.endDate.toISOString().split('T')[0] ?? ''
            break
          }
          case 'last_quarter': {
            periodEnd = now.toISOString().split('T')[0] ?? ''
            const quarterStart = new Date(now)
            quarterStart.setMonth(now.getMonth() - 3)
            periodStart = quarterStart.toISOString().split('T')[0] ?? ''
            break
          }
          case 'last_month': {
            periodEnd = now.toISOString().split('T')[0] ?? ''
            const monthStart = new Date(now)
            monthStart.setMonth(now.getMonth() - 1)
            periodStart = monthStart.toISOString().split('T')[0] ?? ''
            break
          }
          default: {
            // Default to current year
            periodStart = trainingYear.startDate.toISOString().split('T')[0] ?? ''
            periodEnd = trainingYear.endDate.toISOString().split('T')[0] ?? ''
          }
        }
      }

      // Build member query
      const memberWhere: Record<string, unknown> = {
        status: 'active',
      }

      if (config.organizationOption === 'specific_division' && config.divisionId) {
        memberWhere.divisionId = config.divisionId
      }

      if (config.organizationOption === 'specific_member' && config.memberId) {
        memberWhere.id = config.memberId
      }

      if (!config.includeFTStaff) {
        memberWhere.memberType = 'class_a'
      }

      // Get members with attendance data
      const members = await prisma.member.findMany({
        where: memberWhere as Record<string, unknown>,
        include: {
          division: {
            select: {
              id: true,
              name: true,
            },
          },
          bmq_enrollments: {
            where: {
              status: 'enrolled',
            },
            take: 1,
            orderBy: {
              enrolled_at: 'desc',
            },
          },
          checkins: {
            where: {
              timestamp: {
                gte: new Date(periodStart),
                lte: new Date(periodEnd),
              },
            },
          },
        },
        orderBy: [{ division: { name: 'asc' } }, { rank: 'asc' }, { lastName: 'asc' }],
      })

      // Calculate attendance for each member (simplified - production would use attendance calculator)
      const records = members.map((member) => {
        const totalCheckins = member.checkins.length
        const attendance = {
          status: totalCheckins === 0 ? ('new' as const) : ('calculated' as const),
          percentage: totalCheckins > 0 ? Math.round((totalCheckins / 10) * 100) : undefined, // Simplified calculation
          attended: totalCheckins > 0 ? totalCheckins : undefined,
          possible: totalCheckins > 0 ? 10 : undefined, // Simplified
          flag: (totalCheckins >= 8 ? 'none' : totalCheckins >= 5 ? 'warning' : 'critical') as
            | 'none'
            | 'warning'
            | 'critical',
        }

        return {
          member: {
            id: member.id,
            serviceNumber: member.serviceNumber,
            firstName: member.firstName,
            lastName: member.lastName,
            rank: member.rank,
            division: {
              id: member.division?.id ?? 'Unknown',
              name: member.division?.name ?? 'Unknown',
            },
          },
          attendance,
          trend: {
            trend: 'stable' as const,
            delta: 0,
          },
          isBMQEnrolled: member.bmq_enrollments.length > 0 && config.showBMQBadge,
          enrollmentDate:
            member.bmq_enrollments.length > 0 && member.bmq_enrollments[0]
              ? member.bmq_enrollments[0].enrolled_at.toISOString()
              : new Date().toISOString(),
        }
      })

      return {
        status: 200 as const,
        body: {
          generatedAt: new Date().toISOString(),
          config,
          periodStart,
          periodEnd,
          records,
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to generate training night attendance report',
        },
      }
    }
  },

  /**
   * POST /api/reports/bmq-attendance - Generate BMQ course attendance report
   */
  generateBMQAttendance: async ({ body }) => {
    try {
      const config: BMQReportConfig = body

      // Get BMQ course
      const course = await prisma.bmq_courses.findUnique({
        where: { id: config.courseId },
      })

      if (!course) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `BMQ course with ID '${config.courseId}' not found`,
          },
        }
      }

      // Build enrollment query
      const enrollmentWhere: Record<string, unknown> = {
        bmq_course_id: config.courseId,
      }

      // Get enrollments with member data
      const enrollments = await prisma.bmq_enrollments.findMany({
        where: enrollmentWhere,
        include: {
          members: {
            include: {
              division: {
                select: {
                  id: true,
                  name: true,
                },
              },
              checkins: {
                where: {
                  timestamp: {
                    gte: course.start_date,
                    lte: course.end_date,
                  },
                },
              },
            },
          },
        },
        orderBy: {
          members: {
            lastName: 'asc',
          },
        },
      })

      // Filter by division if specified
      interface EnrollmentRecord {
        id: string
        member_id: string
        bmq_course_id: string
        enrolled_at: Date
        completed_at: Date | null
        status: string
        members: {
          id: string
          serviceNumber: string
          firstName: string
          lastName: string
          rank: string
          divisionId: string | null
          division: { id: string; name: string } | null
          checkins: { id: string; timestamp: Date; direction: string }[]
        }
      }
      const filteredEnrollments =
        config.organizationOption === 'specific_division' && config.divisionId
          ? enrollments.filter((e: EnrollmentRecord) => e.members.divisionId === config.divisionId)
          : enrollments

      // Calculate attendance for each enrollment
      const records = filteredEnrollments.map((enrollment: EnrollmentRecord) => {
        const totalCheckins = enrollment.members.checkins.length
        const attendance = {
          status: totalCheckins === 0 ? ('new' as const) : ('calculated' as const),
          percentage: totalCheckins > 0 ? Math.round((totalCheckins / 20) * 100) : undefined, // Simplified
          attended: totalCheckins > 0 ? totalCheckins : undefined,
          possible: totalCheckins > 0 ? 20 : undefined, // Simplified
        }

        return {
          member: {
            id: enrollment.members.id,
            serviceNumber: enrollment.members.serviceNumber,
            firstName: enrollment.members.firstName,
            lastName: enrollment.members.lastName,
            rank: enrollment.members.rank,
            division: {
              id: enrollment.members.division?.id ?? 'Unknown',
              name: enrollment.members.division?.name ?? 'Unknown',
            },
          },
          attendance,
          enrollment: {
            id: enrollment.id,
            enrolledAt: enrollment.enrolled_at.toISOString(),
            completedAt: enrollment.completed_at?.toISOString() || null,
            status: enrollment.status,
          },
        }
      })

      return {
        status: 200 as const,
        body: {
          generatedAt: new Date().toISOString(),
          config,
          records,
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to generate BMQ attendance report',
        },
      }
    }
  },

  /**
   * POST /api/reports/personnel-roster - Generate personnel roster report
   */
  generatePersonnelRoster: async ({ body }) => {
    try {
      const config: PersonnelRosterConfig = body

      // Build member query
      const memberWhere: Record<string, unknown> = {
        status: 'active',
      }

      if (config.divisionId) {
        memberWhere.divisionId = config.divisionId
      }

      // Build order by clause
      const orderBy: Array<Record<string, unknown>> = []

      switch (config.sortOrder) {
        case 'division_rank':
          orderBy.push({ division: { name: 'asc' } }, { rank: 'asc' }, { lastName: 'asc' })
          break
        case 'rank':
          orderBy.push({ rank: 'asc' }, { lastName: 'asc' })
          break
        case 'alphabetical':
          orderBy.push({ lastName: 'asc' }, { firstName: 'asc' })
          break
      }

      // Get members
      const members = await prisma.member.findMany({
        where: memberWhere,
        include: {
          division: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy,
      })

      const records = members.map((member) => ({
        id: member.id,
        serviceNumber: member.serviceNumber,
        rank: member.rank,
        firstName: member.firstName,
        lastName: member.lastName,
        middleInitial: member.initials || null,
        division: {
          id: member.division?.id ?? 'Unknown',
          name: member.division?.name ?? 'Unknown',
        },
        badgeId: member.badgeId || null,
        status: member.status,
        memberType: member.memberType,
        email: member.email || null,
        phoneNumber: member.mobilePhone || member.homePhone || null,
      }))

      return {
        status: 200 as const,
        body: {
          generatedAt: new Date().toISOString(),
          config,
          records,
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to generate personnel roster',
        },
      }
    }
  },

  /**
   * POST /api/reports/visitor-summary - Generate visitor summary report
   */
  generateVisitorSummary: async ({ body }) => {
    try {
      const config: VisitorSummaryConfig = body

      // Build visitor query
      const visitorWhere: Record<string, unknown> = {
        checkInTime: {
          gte: new Date(config.startDate),
          lte: new Date(config.endDate),
        },
      }

      if (config.visitType) {
        visitorWhere.visitType = config.visitType
      }

      if (config.organization) {
        visitorWhere.organization = {
          contains: config.organization,
          mode: 'insensitive',
        }
      }

      // Get visitors
      const visitors = await prisma.visitor.findMany({
        where: visitorWhere,
        include: {
          hostMember: {
            include: {
              division: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          checkInTime: 'asc',
        },
      })

      const records = visitors.map((visitor) => ({
        id: visitor.id,
        fullName: visitor.firstName && visitor.lastName ? `${visitor.firstName} ${visitor.lastName}` : visitor.id,
        organization: visitor.organization || null,
        purpose: visitor.purpose || null,
        visitType: visitor.visitType,
        checkInTime: visitor.checkInTime.toISOString(),
        checkOutTime: visitor.checkOutTime?.toISOString() || null,
        duration: visitor.checkOutTime
          ? Math.round(
              (visitor.checkOutTime.getTime() - visitor.checkInTime.getTime()) / 60000
            )
          : null,
        hostMember: visitor.hostMember
          ? {
              id: visitor.hostMember.id,
              serviceNumber: visitor.hostMember.serviceNumber,
              firstName: visitor.hostMember.firstName,
              lastName: visitor.hostMember.lastName,
              rank: visitor.hostMember.rank,
              division: {
                id: visitor.hostMember.division?.id ?? 'Unknown',
                name: visitor.hostMember.division?.name ?? 'Unknown',
              },
            }
          : null,
      }))

      // Calculate summary statistics
      const byVisitType: Record<string, number> = {}
      const byOrganization: Record<string, number> = {}

      for (const visitor of visitors) {
        byVisitType[visitor.visitType] = (byVisitType[visitor.visitType] || 0) + 1

        if (visitor.organization) {
          byOrganization[visitor.organization] =
            (byOrganization[visitor.organization] || 0) + 1
        }
      }

      return {
        status: 200 as const,
        body: {
          generatedAt: new Date().toISOString(),
          config,
          records,
          summary: {
            totalVisitors: visitors.length,
            byVisitType: Object.entries(byVisitType).map(([visitType, count]) => ({
              visitType,
              count,
            })),
            byOrganization: Object.entries(byOrganization).map(([organization, count]) => ({
              organization,
              count,
            })),
          },
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to generate visitor summary',
        },
      }
    }
  },
})
