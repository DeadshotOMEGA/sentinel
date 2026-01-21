import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { TestDatabase } from '../../helpers/testcontainers'
import { MemberService } from '../../../src/services/member-service'
import { createDivision, createBadge, createMember } from '../../helpers/factories'
import type { PrismaClient } from '@sentinel/database'
import type { CreateMemberInput, UpdateMemberInput } from '@sentinel/types'

describe('MemberService Integration Tests', () => {
  const testDb = new TestDatabase()
  let service: MemberService
  let prisma: PrismaClient

  beforeAll(async () => {
    await testDb.start()
    prisma = testDb.prisma!
    service = new MemberService(prisma)
  }, 60000)

  afterAll(async () => {
    await testDb.stop()
  })

  beforeEach(async () => {
    await testDb.reset()
    await testDb.seed()
  })

  describe('findById', () => {
    it('should find member by ID with division', async () => {
      const division = await createDivision(prisma)
      const created = await createMember(prisma, {
        serviceNumber: 'SN001',
        firstName: 'John',
        lastName: 'Doe',
        divisionId: division.id,
      })

      const result = await service.findById(created.id)

      expect(result).toBeDefined()
      expect(result?.id).toBe(created.id)
      expect(result?.serviceNumber).toBe('SN001')
      expect(result?.division).toBeDefined()
      expect(result?.division.id).toBe(division.id)
    })

    it('should return null for non-existent ID', async () => {
      const result = await service.findById('00000000-0000-0000-0000-000000000000')
      expect(result).toBeNull()
    })

    it('should throw ValidationError for empty ID', async () => {
      await expect(service.findById('')).rejects.toThrow('Member ID cannot be empty')
    })
  })

  describe('findByServiceNumber', () => {
    it('should find member by service number', async () => {
      await createMember(prisma, {
        serviceNumber: 'SN002',
        firstName: 'Jane',
        lastName: 'Smith',
      })

      const result = await service.findByServiceNumber('SN002')

      expect(result).toBeDefined()
      expect(result?.serviceNumber).toBe('SN002')
      expect(result?.firstName).toBe('Jane')
    })

    it('should return null for non-existent service number', async () => {
      const result = await service.findByServiceNumber('NONEXISTENT')
      expect(result).toBeNull()
    })

    it('should throw ValidationError for empty service number', async () => {
      await expect(service.findByServiceNumber('')).rejects.toThrow(
        'Service number cannot be empty'
      )
    })
  })

  describe('create', () => {
    it('should create a new member', async () => {
      const division = await createDivision(prisma)

      const input: CreateMemberInput = {
        serviceNumber: 'SN003',
        firstName: 'Bob',
        lastName: 'Johnson',
        rank: 'MS',
        divisionId: division.id,
        memberType: 'reserve',
        status: 'active',
      }

      const result = await service.create(input)

      expect(result.id).toBeDefined()
      expect(result.serviceNumber).toBe('SN003')
      expect(result.firstName).toBe('Bob')
      expect(result.lastName).toBe('Johnson')
      expect(result.rank).toBe('MS')
    })

    it('should throw ValidationError for missing required fields', async () => {
      const division = await createDivision(prisma)

      const input = {
        serviceNumber: '',
        firstName: 'Test',
        lastName: 'User',
        rank: 'AB',
        divisionId: division.id,
      } as CreateMemberInput

      await expect(service.create(input)).rejects.toThrow('Service number is required')
    })

    it('should throw ConflictError for duplicate service number', async () => {
      const division = await createDivision(prisma)

      await createMember(prisma, {
        serviceNumber: 'SN004',
        divisionId: division.id,
      })

      const input: CreateMemberInput = {
        serviceNumber: 'SN004',
        firstName: 'New',
        lastName: 'User',
        rank: 'AB',
        divisionId: division.id,
        memberType: 'reserve',
        status: 'active',
      }

      await expect(service.create(input)).rejects.toThrow(
        'Service number SN004 is already in use'
      )
    })

    it('should create member with badge assignment', async () => {
      const division = await createDivision(prisma)
      const badge = await createBadge(prisma, {
        assignmentType: 'unassigned',
      })

      const input: CreateMemberInput = {
        serviceNumber: 'SN005',
        firstName: 'Badge',
        lastName: 'User',
        rank: 'AB',
        divisionId: division.id,
        badgeId: badge.id,
        memberType: 'reserve',
        status: 'active',
      }

      const result = await service.create(input)

      expect(result.badgeId).toBe(badge.id)

      // Verify badge was assigned
      const updatedBadge = await prisma.badge.findUnique({ where: { id: badge.id } })
      expect(updatedBadge?.assignmentType).toBe('member')
      expect(updatedBadge?.assignedToId).toBe(result.id)
    })

    it('should throw NotFoundError for non-existent badge', async () => {
      const division = await createDivision(prisma)

      const input: CreateMemberInput = {
        serviceNumber: 'SN006',
        firstName: 'Test',
        lastName: 'User',
        rank: 'AB',
        divisionId: division.id,
        badgeId: '00000000-0000-0000-0000-000000000000',
        memberType: 'reserve',
        status: 'active',
      }

      await expect(service.create(input)).rejects.toThrow()
    })
  })

  describe('update', () => {
    it('should update member successfully', async () => {
      const created = await createMember(prisma, {
        serviceNumber: 'SN007',
        firstName: 'Original',
        lastName: 'Name',
      })

      const updateData: UpdateMemberInput = {
        firstName: 'Updated',
        lastName: 'Name',
      }

      const result = await service.update(created.id, updateData)

      expect(result.firstName).toBe('Updated')
      expect(result.lastName).toBe('Name')
      expect(result.serviceNumber).toBe('SN007') // Unchanged
    })

    it('should throw NotFoundError for non-existent member', async () => {
      const updateData: UpdateMemberInput = {
        firstName: 'Updated',
      }

      await expect(
        service.update('00000000-0000-0000-0000-000000000000', updateData)
      ).rejects.toThrow()
    })

    it('should handle badge reassignment', async () => {
      const badge1 = await createBadge(prisma, { assignmentType: 'unassigned' })
      const badge2 = await createBadge(prisma, { assignmentType: 'unassigned' })

      const member = await createMember(prisma, { badgeId: badge1.id })

      // Manually assign badge1 (factory doesn't do it)
      await prisma.badge.update({
        where: { id: badge1.id },
        data: {
          assignmentType: 'member',
          assignedToId: member.id,
        },
      })

      const updateData: UpdateMemberInput = {
        badgeId: badge2.id,
      }

      const result = await service.update(member.id, updateData)

      expect(result.badgeId).toBe(badge2.id)

      // Verify old badge was unassigned
      const oldBadge = await prisma.badge.findUnique({ where: { id: badge1.id } })
      expect(oldBadge?.assignmentType).toBe('unassigned')
      expect(oldBadge?.assignedToId).toBeNull()

      // Verify new badge was assigned
      const newBadge = await prisma.badge.findUnique({ where: { id: badge2.id } })
      expect(newBadge?.assignmentType).toBe('member')
      expect(newBadge?.assignedToId).toBe(member.id)
    })
  })

  describe('deactivate', () => {
    it('should deactivate member and unassign badge', async () => {
      const badge = await createBadge(prisma, { assignmentType: 'unassigned' })
      const member = await createMember(prisma, { badgeId: badge.id })

      // Manually assign badge
      await prisma.badge.update({
        where: { id: badge.id },
        data: {
          assignmentType: 'member',
          assignedToId: member.id,
        },
      })

      await service.deactivate(member.id)

      // Verify member status changed to inactive
      const updatedMember = await prisma.member.findUnique({ where: { id: member.id } })
      const inactiveStatus = await prisma.memberStatus.findFirst({
        where: { code: 'inactive' },
      })
      expect(updatedMember?.memberStatusId).toBe(inactiveStatus?.id)

      // Verify badge was unassigned
      const updatedBadge = await prisma.badge.findUnique({ where: { id: badge.id } })
      expect(updatedBadge?.assignmentType).toBe('unassigned')
      expect(updatedBadge?.assignedToId).toBeNull()
    })
  })

  describe('getPresenceStatus', () => {
    it('should return presence status based on last checkin', async () => {
      const member = await createMember(prisma)

      // Create check-in
      await prisma.checkin.create({
        data: {
          memberId: member.id,
          direction: 'in',
          timestamp: new Date(),
          kioskId: 'TEST-KIOSK',
        },
      })

      const result = await service.getPresenceStatus(member.id)

      expect(result.isPresent).toBe(true)
      expect(result.lastCheckin).toBeDefined()
      expect(result.lastCheckin?.direction).toBe('in')
    })

    it('should return false when last checkin is out', async () => {
      const member = await createMember(prisma)

      // Create check-out
      await prisma.checkin.create({
        data: {
          memberId: member.id,
          direction: 'out',
          timestamp: new Date(),
          kioskId: 'TEST-KIOSK',
        },
      })

      const result = await service.getPresenceStatus(member.id)

      expect(result.isPresent).toBe(false)
      expect(result.lastCheckin).toBeDefined()
      expect(result.lastCheckin?.direction).toBe('out')
    })
  })

  describe('assignBadge', () => {
    it('should assign badge to member', async () => {
      const member = await createMember(prisma)
      const badge = await createBadge(prisma, { assignmentType: 'unassigned' })

      await service.assignBadge(member.id, badge.id)

      // Verify member has badge
      const updatedMember = await prisma.member.findUnique({ where: { id: member.id } })
      expect(updatedMember?.badgeId).toBe(badge.id)

      // Verify badge is assigned
      const updatedBadge = await prisma.badge.findUnique({ where: { id: badge.id } })
      expect(updatedBadge?.assignmentType).toBe('member')
      expect(updatedBadge?.assignedToId).toBe(member.id)
    })

    it('should throw ConflictError for already assigned badge', async () => {
      const member1 = await createMember(prisma)
      const member2 = await createMember(prisma)
      const badge = await createBadge(prisma, { assignmentType: 'unassigned' })

      // Assign badge to member1
      await service.assignBadge(member1.id, badge.id)

      // Try to assign same badge to member2
      await expect(service.assignBadge(member2.id, badge.id)).rejects.toThrow()
    })
  })

  describe('unassignBadge', () => {
    it('should unassign badge from member', async () => {
      const badge = await createBadge(prisma, { assignmentType: 'unassigned' })
      const member = await createMember(prisma, { badgeId: badge.id })

      // Manually assign badge
      await prisma.badge.update({
        where: { id: badge.id },
        data: {
          assignmentType: 'member',
          assignedToId: member.id,
        },
      })

      await service.unassignBadge(member.id)

      // Verify member has no badge
      const updatedMember = await prisma.member.findUnique({ where: { id: member.id } })
      expect(updatedMember?.badgeId).toBeNull()

      // Verify badge is unassigned
      const updatedBadge = await prisma.badge.findUnique({ where: { id: badge.id } })
      expect(updatedBadge?.assignmentType).toBe('unassigned')
      expect(updatedBadge?.assignedToId).toBeNull()
    })

    it('should throw ValidationError when member has no badge', async () => {
      const member = await createMember(prisma, { badgeId: undefined })

      await expect(service.unassignBadge(member.id)).rejects.toThrow(
        'does not have a badge assigned'
      )
    })
  })

  describe('findPaginated', () => {
    it('should return paginated results', async () => {
      const division = await createDivision(prisma)

      // Create multiple members
      for (let i = 1; i <= 25; i++) {
        await createMember(prisma, {
          serviceNumber: `PAGE${i.toString().padStart(3, '0')}`,
          firstName: `First${i}`,
          lastName: `Last${i}`,
          divisionId: division.id,
        })
      }

      const result = await service.findPaginated({
        page: 1,
        limit: 10,
      })

      expect(result.members).toHaveLength(10)
      expect(result.total).toBe(25)
      expect(result.page).toBe(1)
      expect(result.limit).toBe(10)
      expect(result.totalPages).toBe(3)
    })

    it('should validate pagination parameters', async () => {
      await expect(service.findPaginated({ page: 0, limit: 10 })).rejects.toThrow(
        'Page must be >= 1'
      )

      await expect(service.findPaginated({ page: 1, limit: 101 })).rejects.toThrow(
        'Limit must be between 1 and 100'
      )
    })
  })
})
