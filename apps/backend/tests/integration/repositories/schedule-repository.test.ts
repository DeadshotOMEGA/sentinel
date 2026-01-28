import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { TestDatabase } from '../../helpers/testcontainers'
import {
  createMember,
  createDutyRole,
  createDutyPosition,
  createWeeklySchedule,
  createScheduleAssignment,
  createAdminUser,
} from '../../helpers/factories'
import { ScheduleRepository } from '@/repositories/schedule-repository'

describe('ScheduleRepository Integration Tests', () => {
  const testDb = new TestDatabase()
  let repo: ScheduleRepository

  beforeAll(async () => {
    await testDb.start()
    repo = new ScheduleRepository(testDb.prisma!)
  }, 60000)

  afterAll(async () => {
    await testDb.stop()
  })

  beforeEach(async () => {
    await testDb.reset()
    await testDb.seed()
  })

  // ==========================================================================
  // Duty Roles
  // ==========================================================================

  describe('findAllDutyRoles', () => {
    it('should return empty array when no duty roles exist', async () => {
      const roles = await repo.findAllDutyRoles()
      expect(roles).toEqual([])
    })

    it('should return all duty roles ordered by displayOrder', async () => {
      await createDutyRole(testDb.prisma!, { code: 'ROLE_B', displayOrder: 2 })
      await createDutyRole(testDb.prisma!, { code: 'ROLE_A', displayOrder: 1 })
      await createDutyRole(testDb.prisma!, { code: 'ROLE_C', displayOrder: 3 })

      const roles = await repo.findAllDutyRoles()

      expect(roles).toHaveLength(3)
      expect(roles[0]!.code).toBe('ROLE_A')
      expect(roles[1]!.code).toBe('ROLE_B')
      expect(roles[2]!.code).toBe('ROLE_C')
    })
  })

  describe('findDutyRoleById', () => {
    it('should return null for non-existent role', async () => {
      const role = await repo.findDutyRoleById('non-existent-id')
      expect(role).toBeNull()
    })

    it('should return duty role with positions', async () => {
      const createdRole = await createDutyRole(testDb.prisma!, { code: 'DDS' })
      await createDutyPosition(testDb.prisma!, {
        dutyRoleId: createdRole.id,
        code: 'POS1',
        displayOrder: 1,
      })
      await createDutyPosition(testDb.prisma!, {
        dutyRoleId: createdRole.id,
        code: 'POS2',
        displayOrder: 2,
      })

      const role = await repo.findDutyRoleById(createdRole.id)

      expect(role).toBeDefined()
      expect(role!.code).toBe('DDS')
      expect(role!.positions).toHaveLength(2)
      expect(role!.positions[0]!.code).toBe('POS1')
      expect(role!.positions[1]!.code).toBe('POS2')
    })
  })

  describe('findDutyRoleByCode', () => {
    it('should return null for non-existent code', async () => {
      const role = await repo.findDutyRoleByCode('NON_EXISTENT')
      expect(role).toBeNull()
    })

    it('should return duty role by code', async () => {
      await createDutyRole(testDb.prisma!, { code: 'DDS', name: 'Duty Day Staff' })

      const role = await repo.findDutyRoleByCode('DDS')

      expect(role).toBeDefined()
      expect(role!.code).toBe('DDS')
      expect(role!.name).toBe('Duty Day Staff')
    })
  })

  describe('findPositionsByRoleId', () => {
    it('should return empty array for role with no positions', async () => {
      const role = await createDutyRole(testDb.prisma!)

      const positions = await repo.findPositionsByRoleId(role.id)

      expect(positions).toEqual([])
    })

    it('should return positions ordered by displayOrder', async () => {
      const role = await createDutyRole(testDb.prisma!)
      await createDutyPosition(testDb.prisma!, {
        dutyRoleId: role.id,
        code: 'BM',
        displayOrder: 3,
      })
      await createDutyPosition(testDb.prisma!, {
        dutyRoleId: role.id,
        code: 'SWK',
        displayOrder: 1,
      })
      await createDutyPosition(testDb.prisma!, {
        dutyRoleId: role.id,
        code: 'QM',
        displayOrder: 2,
      })

      const positions = await repo.findPositionsByRoleId(role.id)

      expect(positions).toHaveLength(3)
      expect(positions[0]!.code).toBe('SWK')
      expect(positions[1]!.code).toBe('QM')
      expect(positions[2]!.code).toBe('BM')
    })
  })

  // ==========================================================================
  // Weekly Schedules
  // ==========================================================================

  describe('findSchedules', () => {
    it('should return empty array when no schedules exist', async () => {
      const schedules = await repo.findSchedules()
      expect(schedules).toEqual([])
    })

    it('should filter by dutyRoleId', async () => {
      const role1 = await createDutyRole(testDb.prisma!, { code: 'DDS' })
      const role2 = await createDutyRole(testDb.prisma!, { code: 'DUTY_WATCH' })

      await createWeeklySchedule(testDb.prisma!, { dutyRoleId: role1.id })
      await createWeeklySchedule(testDb.prisma!, { dutyRoleId: role2.id })

      const schedules = await repo.findSchedules({ dutyRoleId: role1.id })

      expect(schedules).toHaveLength(1)
      expect(schedules[0]!.dutyRoleId).toBe(role1.id)
    })

    it('should filter by status', async () => {
      const role = await createDutyRole(testDb.prisma!)
      const monday = getMonday(new Date())
      const nextMonday = new Date(monday)
      nextMonday.setDate(monday.getDate() + 7)

      await createWeeklySchedule(testDb.prisma!, {
        dutyRoleId: role.id,
        weekStartDate: monday,
        status: 'draft',
      })
      await createWeeklySchedule(testDb.prisma!, {
        dutyRoleId: role.id,
        weekStartDate: nextMonday,
        status: 'published',
      })

      const schedules = await repo.findSchedules({ status: 'published' })

      expect(schedules).toHaveLength(1)
      expect(schedules[0]!.status).toBe('published')
    })

    it('should support pagination', async () => {
      const role = await createDutyRole(testDb.prisma!)
      const monday = getMonday(new Date())

      // Create 5 schedules with different week start dates
      for (let i = 0; i < 5; i++) {
        const weekStart = new Date(monday)
        weekStart.setDate(monday.getDate() + i * 7)
        await createWeeklySchedule(testDb.prisma!, {
          dutyRoleId: role.id,
          weekStartDate: weekStart,
        })
      }

      const page1 = await repo.findSchedules({ limit: 2, offset: 0 })
      const page2 = await repo.findSchedules({ limit: 2, offset: 2 })

      expect(page1).toHaveLength(2)
      expect(page2).toHaveLength(2)
    })
  })

  describe('findSchedulesByWeekStart', () => {
    it('should return schedules for specific week', async () => {
      const role1 = await createDutyRole(testDb.prisma!, { code: 'DDS' })
      const role2 = await createDutyRole(testDb.prisma!, { code: 'DUTY_WATCH' })
      const monday = getMonday(new Date())

      await createWeeklySchedule(testDb.prisma!, {
        dutyRoleId: role1.id,
        weekStartDate: monday,
      })
      await createWeeklySchedule(testDb.prisma!, {
        dutyRoleId: role2.id,
        weekStartDate: monday,
      })

      const schedules = await repo.findSchedulesByWeekStart(monday)

      expect(schedules).toHaveLength(2)
    })
  })

  describe('findScheduleById', () => {
    it('should return null for non-existent schedule', async () => {
      const schedule = await repo.findScheduleById('non-existent-id')
      expect(schedule).toBeNull()
    })

    it('should return schedule with assignments', async () => {
      const role = await createDutyRole(testDb.prisma!)
      const schedule = await createWeeklySchedule(testDb.prisma!, { dutyRoleId: role.id })
      const member = await createMember(testDb.prisma!)
      await createScheduleAssignment(testDb.prisma!, {
        scheduleId: schedule.id,
        memberId: member.id,
      })

      const found = await repo.findScheduleById(schedule.id)

      expect(found).toBeDefined()
      expect(found!.assignments).toHaveLength(1)
      expect(found!.assignments[0]!.memberId).toBe(member.id)
    })
  })

  describe('findScheduleByRoleAndWeek', () => {
    it('should return null when schedule does not exist', async () => {
      const role = await createDutyRole(testDb.prisma!)
      const monday = getMonday(new Date())

      const schedule = await repo.findScheduleByRoleAndWeek(role.id, monday)

      expect(schedule).toBeNull()
    })

    it('should find schedule by role and week', async () => {
      const role = await createDutyRole(testDb.prisma!)
      const monday = getMonday(new Date())
      await createWeeklySchedule(testDb.prisma!, {
        dutyRoleId: role.id,
        weekStartDate: monday,
      })

      const schedule = await repo.findScheduleByRoleAndWeek(role.id, monday)

      expect(schedule).toBeDefined()
      expect(schedule!.dutyRoleId).toBe(role.id)
    })
  })

  describe('createSchedule', () => {
    it('should create a new schedule', async () => {
      const role = await createDutyRole(testDb.prisma!)
      const monday = getMonday(new Date())
      const admin = await createAdminUser(testDb.prisma!)

      const schedule = await repo.createSchedule({
        dutyRoleId: role.id,
        weekStartDate: monday,
        createdBy: admin.id,
        notes: 'Test notes',
      })

      expect(schedule).toBeDefined()
      expect(schedule.dutyRoleId).toBe(role.id)
      expect(schedule.status).toBe('draft')
      expect(schedule.createdBy).toBe(admin.id)
      expect(schedule.notes).toBe('Test notes')
      expect(schedule.assignments).toEqual([])
    })
  })

  describe('updateSchedule', () => {
    it('should update schedule notes', async () => {
      const schedule = await createWeeklySchedule(testDb.prisma!, { notes: 'Original' })

      const updated = await repo.updateSchedule(schedule.id, { notes: 'Updated notes' })

      expect(updated.notes).toBe('Updated notes')
    })
  })

  describe('publishSchedule', () => {
    it('should publish a schedule', async () => {
      const schedule = await createWeeklySchedule(testDb.prisma!, { status: 'draft' })
      const admin = await createAdminUser(testDb.prisma!)

      const published = await repo.publishSchedule(schedule.id, admin.id)

      expect(published.status).toBe('published')
      expect(published.publishedAt).toBeInstanceOf(Date)
      expect(published.publishedBy).toBe(admin.id)
    })
  })

  describe('archiveSchedule', () => {
    it('should archive a schedule', async () => {
      const schedule = await createWeeklySchedule(testDb.prisma!, { status: 'published' })

      const archived = await repo.archiveSchedule(schedule.id)

      expect(archived.status).toBe('archived')
    })
  })

  describe('deleteSchedule', () => {
    it('should delete a schedule', async () => {
      const schedule = await createWeeklySchedule(testDb.prisma!)

      await repo.deleteSchedule(schedule.id)

      const found = await repo.findScheduleById(schedule.id)
      expect(found).toBeNull()
    })
  })

  // ==========================================================================
  // Schedule Assignments
  // ==========================================================================

  describe('findAssignmentById', () => {
    it('should return null for non-existent assignment', async () => {
      const assignment = await repo.findAssignmentById('non-existent-id')
      expect(assignment).toBeNull()
    })

    it('should return assignment with member and position', async () => {
      const role = await createDutyRole(testDb.prisma!)
      const position = await createDutyPosition(testDb.prisma!, { dutyRoleId: role.id })
      const schedule = await createWeeklySchedule(testDb.prisma!, { dutyRoleId: role.id })
      const member = await createMember(testDb.prisma!, { firstName: 'John', lastName: 'Doe' })
      const assignment = await createScheduleAssignment(testDb.prisma!, {
        scheduleId: schedule.id,
        dutyPositionId: position.id,
        memberId: member.id,
      })

      const found = await repo.findAssignmentById(assignment.id)

      expect(found).toBeDefined()
      expect(found!.member.firstName).toBe('John')
      expect(found!.member.lastName).toBe('Doe')
      expect(found!.dutyPosition).toBeDefined()
      expect(found!.dutyPosition!.id).toBe(position.id)
    })
  })

  describe('findAssignmentsByScheduleId', () => {
    it('should return empty array for schedule with no assignments', async () => {
      const schedule = await createWeeklySchedule(testDb.prisma!)

      const assignments = await repo.findAssignmentsByScheduleId(schedule.id)

      expect(assignments).toEqual([])
    })

    it('should return assignments ordered by position displayOrder', async () => {
      const role = await createDutyRole(testDb.prisma!)
      const pos1 = await createDutyPosition(testDb.prisma!, {
        dutyRoleId: role.id,
        code: 'BM',
        displayOrder: 3,
      })
      const pos2 = await createDutyPosition(testDb.prisma!, {
        dutyRoleId: role.id,
        code: 'SWK',
        displayOrder: 1,
      })
      const schedule = await createWeeklySchedule(testDb.prisma!, { dutyRoleId: role.id })

      const member1 = await createMember(testDb.prisma!)
      const member2 = await createMember(testDb.prisma!)

      await createScheduleAssignment(testDb.prisma!, {
        scheduleId: schedule.id,
        dutyPositionId: pos1.id,
        memberId: member1.id,
      })
      await createScheduleAssignment(testDb.prisma!, {
        scheduleId: schedule.id,
        dutyPositionId: pos2.id,
        memberId: member2.id,
      })

      const assignments = await repo.findAssignmentsByScheduleId(schedule.id)

      expect(assignments).toHaveLength(2)
      expect(assignments[0]!.dutyPosition!.code).toBe('SWK')
      expect(assignments[1]!.dutyPosition!.code).toBe('BM')
    })
  })

  describe('createAssignment', () => {
    it('should create an assignment', async () => {
      const schedule = await createWeeklySchedule(testDb.prisma!)
      const member = await createMember(testDb.prisma!)

      const assignment = await repo.createAssignment({
        scheduleId: schedule.id,
        memberId: member.id,
        notes: 'Test assignment',
      })

      expect(assignment).toBeDefined()
      expect(assignment.scheduleId).toBe(schedule.id)
      expect(assignment.memberId).toBe(member.id)
      expect(assignment.status).toBe('assigned')
      expect(assignment.notes).toBe('Test assignment')
    })

    it('should create assignment with position', async () => {
      const role = await createDutyRole(testDb.prisma!)
      const position = await createDutyPosition(testDb.prisma!, { dutyRoleId: role.id })
      const schedule = await createWeeklySchedule(testDb.prisma!, { dutyRoleId: role.id })
      const member = await createMember(testDb.prisma!)

      const assignment = await repo.createAssignment({
        scheduleId: schedule.id,
        dutyPositionId: position.id,
        memberId: member.id,
      })

      expect(assignment.dutyPositionId).toBe(position.id)
      expect(assignment.dutyPosition).toBeDefined()
    })
  })

  describe('updateAssignment', () => {
    it('should update assignment status to confirmed', async () => {
      const assignment = await createScheduleAssignment(testDb.prisma!)

      const updated = await repo.updateAssignment(assignment.id, { status: 'confirmed' })

      expect(updated.status).toBe('confirmed')
      expect(updated.confirmedAt).toBeInstanceOf(Date)
    })

    it('should update assignment status to released', async () => {
      const assignment = await createScheduleAssignment(testDb.prisma!)

      const updated = await repo.updateAssignment(assignment.id, { status: 'released' })

      expect(updated.status).toBe('released')
      expect(updated.releasedAt).toBeInstanceOf(Date)
    })

    it('should update assignment notes', async () => {
      const assignment = await createScheduleAssignment(testDb.prisma!)

      const updated = await repo.updateAssignment(assignment.id, { notes: 'Updated notes' })

      expect(updated.notes).toBe('Updated notes')
    })
  })

  describe('deleteAssignment', () => {
    it('should delete an assignment', async () => {
      const assignment = await createScheduleAssignment(testDb.prisma!)

      await repo.deleteAssignment(assignment.id)

      const found = await repo.findAssignmentById(assignment.id)
      expect(found).toBeNull()
    })
  })

  describe('memberHasAssignmentInSchedule', () => {
    it('should return false when member has no assignment', async () => {
      const schedule = await createWeeklySchedule(testDb.prisma!)
      const member = await createMember(testDb.prisma!)

      const hasAssignment = await repo.memberHasAssignmentInSchedule(schedule.id, member.id)

      expect(hasAssignment).toBe(false)
    })

    it('should return true when member has assignment', async () => {
      const schedule = await createWeeklySchedule(testDb.prisma!)
      const member = await createMember(testDb.prisma!)
      await createScheduleAssignment(testDb.prisma!, {
        scheduleId: schedule.id,
        memberId: member.id,
      })

      const hasAssignment = await repo.memberHasAssignmentInSchedule(schedule.id, member.id)

      expect(hasAssignment).toBe(true)
    })
  })

  describe('countAssignmentsForPosition', () => {
    it('should return 0 for position with no assignments', async () => {
      const role = await createDutyRole(testDb.prisma!)
      const position = await createDutyPosition(testDb.prisma!, { dutyRoleId: role.id })
      const schedule = await createWeeklySchedule(testDb.prisma!, { dutyRoleId: role.id })

      const count = await repo.countAssignmentsForPosition(schedule.id, position.id)

      expect(count).toBe(0)
    })

    it('should count active assignments only (exclude released)', async () => {
      const role = await createDutyRole(testDb.prisma!)
      const position = await createDutyPosition(testDb.prisma!, { dutyRoleId: role.id })
      const schedule = await createWeeklySchedule(testDb.prisma!, { dutyRoleId: role.id })

      const member1 = await createMember(testDb.prisma!)
      const member2 = await createMember(testDb.prisma!)
      const member3 = await createMember(testDb.prisma!)

      await createScheduleAssignment(testDb.prisma!, {
        scheduleId: schedule.id,
        dutyPositionId: position.id,
        memberId: member1.id,
        status: 'assigned',
      })
      await createScheduleAssignment(testDb.prisma!, {
        scheduleId: schedule.id,
        dutyPositionId: position.id,
        memberId: member2.id,
        status: 'confirmed',
      })
      await createScheduleAssignment(testDb.prisma!, {
        scheduleId: schedule.id,
        dutyPositionId: position.id,
        memberId: member3.id,
        status: 'released',
      })

      const count = await repo.countAssignmentsForPosition(schedule.id, position.id)

      expect(count).toBe(2) // Only assigned and confirmed, not released
    })
  })

  // ==========================================================================
  // DDS Convenience Methods
  // ==========================================================================

  describe('findDdsAssignmentForWeek', () => {
    it('should return null when DDS role does not exist', async () => {
      const monday = getMonday(new Date())

      const result = await repo.findDdsAssignmentForWeek(monday)

      expect(result).toBeNull()
    })

    it('should return null when no DDS schedule exists for week', async () => {
      await createDutyRole(testDb.prisma!, { code: 'DDS' })
      const monday = getMonday(new Date())

      const result = await repo.findDdsAssignmentForWeek(monday)

      expect(result).toBeNull()
    })

    it('should return null when schedule has no assignments', async () => {
      const ddsRole = await createDutyRole(testDb.prisma!, { code: 'DDS' })
      const monday = getMonday(new Date())
      await createWeeklySchedule(testDb.prisma!, {
        dutyRoleId: ddsRole.id,
        weekStartDate: monday,
      })

      const result = await repo.findDdsAssignmentForWeek(monday)

      expect(result).toBeNull()
    })

    it('should return DDS assignment for the week', async () => {
      const ddsRole = await createDutyRole(testDb.prisma!, { code: 'DDS' })
      const monday = getMonday(new Date())
      const schedule = await createWeeklySchedule(testDb.prisma!, {
        dutyRoleId: ddsRole.id,
        weekStartDate: monday,
      })
      const member = await createMember(testDb.prisma!, { firstName: 'DDS', lastName: 'Person' })
      await createScheduleAssignment(testDb.prisma!, {
        scheduleId: schedule.id,
        memberId: member.id,
        status: 'assigned',
      })

      const result = await repo.findDdsAssignmentForWeek(monday)

      expect(result).toBeDefined()
      expect(result!.schedule.id).toBe(schedule.id)
      expect(result!.assignment.member.firstName).toBe('DDS')
    })

    it('should exclude released assignments', async () => {
      const ddsRole = await createDutyRole(testDb.prisma!, { code: 'DDS' })
      const monday = getMonday(new Date())
      const schedule = await createWeeklySchedule(testDb.prisma!, {
        dutyRoleId: ddsRole.id,
        weekStartDate: monday,
      })
      const member = await createMember(testDb.prisma!)
      await createScheduleAssignment(testDb.prisma!, {
        scheduleId: schedule.id,
        memberId: member.id,
        status: 'released',
      })

      const result = await repo.findDdsAssignmentForWeek(monday)

      expect(result).toBeNull()
    })
  })

  // ==========================================================================
  // Duty Watch Convenience Methods
  // ==========================================================================

  describe('findDutyWatchForWeek', () => {
    it('should return null when DUTY_WATCH role does not exist', async () => {
      const monday = getMonday(new Date())

      const result = await repo.findDutyWatchForWeek(monday)

      expect(result).toBeNull()
    })

    it('should return schedule with assignments for the week', async () => {
      const dutyWatchRole = await createDutyRole(testDb.prisma!, { code: 'DUTY_WATCH' })
      const swkPosition = await createDutyPosition(testDb.prisma!, {
        dutyRoleId: dutyWatchRole.id,
        code: 'SWK',
        displayOrder: 1,
      })
      const qmPosition = await createDutyPosition(testDb.prisma!, {
        dutyRoleId: dutyWatchRole.id,
        code: 'QM',
        displayOrder: 2,
      })

      const monday = getMonday(new Date())
      const schedule = await createWeeklySchedule(testDb.prisma!, {
        dutyRoleId: dutyWatchRole.id,
        weekStartDate: monday,
      })

      const member1 = await createMember(testDb.prisma!)
      const member2 = await createMember(testDb.prisma!)

      await createScheduleAssignment(testDb.prisma!, {
        scheduleId: schedule.id,
        dutyPositionId: swkPosition.id,
        memberId: member1.id,
      })
      await createScheduleAssignment(testDb.prisma!, {
        scheduleId: schedule.id,
        dutyPositionId: qmPosition.id,
        memberId: member2.id,
      })

      const result = await repo.findDutyWatchForWeek(monday)

      expect(result).toBeDefined()
      expect(result!.schedule.id).toBe(schedule.id)
      expect(result!.assignments).toHaveLength(2)
      expect(result!.assignments[0]!.dutyPosition!.code).toBe('SWK')
      expect(result!.assignments[1]!.dutyPosition!.code).toBe('QM')
    })
  })
})

// Helper to get Monday of a given week
function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}
