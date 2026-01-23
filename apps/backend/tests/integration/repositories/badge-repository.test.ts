import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { BadgeRepository } from '../../../src/repositories/badge-repository'
import { TestDatabase } from '../../helpers/testcontainers'
import { createBadge, createMember } from '../../helpers/factories'
import type { CreateBadgeInput } from '@sentinel/types'

describe('BadgeRepository Integration Tests', () => {
  const testDb = new TestDatabase()
  let repo: BadgeRepository

  beforeAll(async () => {
    await testDb.start()
    repo = new BadgeRepository(testDb.prisma!)
  }, 60000)

  afterAll(async () => {
    await testDb.stop()
  })

  beforeEach(async () => {
    await testDb.reset()
    await testDb.seed()
  })

  describe('create', () => {
    it('should create a badge with all fields', async () => {
      const input: CreateBadgeInput = {
        serialNumber: 'ABC123',
        assignmentType: 'unassigned',
        status: 'active',
      }

      const badge = await repo.create(input)

      expect(badge.id).toBeDefined()
      expect(badge.serialNumber).toBe('ABC123')
      expect(badge.assignmentType).toBe('unassigned')
      expect(badge.status).toBe('active')
      expect(badge.assignedToId).toBeUndefined()
    })

    it('should create a badge with defaults', async () => {
      const input: CreateBadgeInput = {
        serialNumber: 'DEF456',
        assignmentType: 'unassigned',
      }

      const badge = await repo.create(input)

      expect(badge.serialNumber).toBe('DEF456')
      expect(badge.assignmentType).toBe('unassigned')
      expect(badge.status).toBe('active')
    })

    it('should throw error when serial number is missing', async () => {
      const input = {} as CreateBadgeInput

      await expect(repo.create(input)).rejects.toThrow('Serial number is required')
    })

    it('should throw error on duplicate serial number', async () => {
      await createBadge(testDb.prisma!, { serialNumber: 'DUP123' })

      const input: CreateBadgeInput = {
        serialNumber: 'DUP123',
        assignmentType: 'unassigned',
      }

      await expect(repo.create(input)).rejects.toThrow()
    })
  })

  describe('findById', () => {
    it('should find badge by ID', async () => {
      const created = await createBadge(testDb.prisma!, { serialNumber: 'TEST001' })

      const found = await repo.findById(created.id)

      expect(found).toBeDefined()
      expect(found!.id).toBe(created.id)
      expect(found!.serialNumber).toBe('TEST001')
    })

    it('should return null when badge does not exist', async () => {
      const found = await repo.findById('a0ebe404-c5d1-41c6-b2da-0f647e49057f')
      expect(found).toBeNull()
    })
  })

  describe('findBySerialNumber', () => {
    it('should find badge by serial number', async () => {
      await createBadge(testDb.prisma!, { serialNumber: 'SN12345' })

      const found = await repo.findBySerialNumber('SN12345')

      expect(found).toBeDefined()
      expect(found!.serialNumber).toBe('SN12345')
    })

    it('should return null when serial number does not exist', async () => {
      const found = await repo.findBySerialNumber('NONEXISTENT')
      expect(found).toBeNull()
    })
  })

  describe('findBySerialNumbers', () => {
    it('should find multiple badges by serial numbers', async () => {
      await createBadge(testDb.prisma!, { serialNumber: 'BATCH1' })
      await createBadge(testDb.prisma!, { serialNumber: 'BATCH2' })
      await createBadge(testDb.prisma!, { serialNumber: 'BATCH3' })

      const found = await repo.findBySerialNumbers(['BATCH1', 'BATCH3'])

      expect(found.length).toBe(2)
      expect(found.map((b) => b.serialNumber).sort()).toEqual(['BATCH1', 'BATCH3'])
    })

    it('should return empty array when no serial numbers provided', async () => {
      const found = await repo.findBySerialNumbers([])
      expect(found).toEqual([])
    })

    it('should skip non-existent serial numbers', async () => {
      await createBadge(testDb.prisma!, { serialNumber: 'EXISTS' })

      const found = await repo.findBySerialNumbers(['EXISTS', 'NOTEXISTS'])

      expect(found.length).toBe(1)
      expect(found[0]!.serialNumber).toBe('EXISTS')
    })
  })

  describe('findAll', () => {
    beforeEach(async () => {
      await createBadge(testDb.prisma!, { serialNumber: 'B1', status: 'active', assignmentType: 'unassigned' })
      await createBadge(testDb.prisma!, { serialNumber: 'B2', status: 'inactive', assignmentType: 'member' })
      await createBadge(testDb.prisma!, { serialNumber: 'B3', status: 'active', assignmentType: 'visitor' })
    })

    it('should find all badges without filters', async () => {
      const badges = await repo.findAll()

      expect(badges.length).toBe(3)
    })

    it('should filter badges by status', async () => {
      const badges = await repo.findAll({ status: 'active' })

      expect(badges.length).toBe(2)
      expect(badges.every((b) => b.status === 'active')).toBe(true)
    })

    it('should filter badges by assignment type', async () => {
      const badges = await repo.findAll({ assignmentType: 'member' })

      expect(badges.length).toBe(1)
      expect(badges[0]!.serialNumber).toBe('B2')
    })

    it('should filter by both status and assignment type', async () => {
      const badges = await repo.findAll({
        status: 'active',
        assignmentType: 'unassigned',
      })

      expect(badges.length).toBe(1)
      expect(badges[0]!.serialNumber).toBe('B1')
    })
  })

  describe('assign', () => {
    it('should assign badge to a member', async () => {
      const badge = await createBadge(testDb.prisma!, { serialNumber: 'ASSIGN1' })
      const division = await testDb.prisma!.division.findFirst()
      const member = await createMember(testDb.prisma!, { divisionId: division!.id })

      const assigned = await repo.assign(badge.id, member.id, 'member')

      expect(assigned.assignmentType).toBe('member')
      expect(assigned.assignedToId).toBe(member.id)
    })

    it('should throw error when assigning with unassigned type', async () => {
      const badge = await createBadge(testDb.prisma!)

      await expect(repo.assign(badge.id, 'some-id', 'unassigned')).rejects.toThrow(
        'Cannot assign badge with type "unassigned"'
      )
    })

    it('should throw error when badge does not exist', async () => {
      await expect(
        repo.assign('a0ebe404-c5d1-41c6-b2da-0f647e49057f', 'member-id', 'member')
      ).rejects.toThrow()
    })
  })

  describe('unassign', () => {
    it('should unassign badge', async () => {
      const division = await testDb.prisma!.division.findFirst()
      const member = await createMember(testDb.prisma!, { divisionId: division!.id })
      const badge = await createBadge(testDb.prisma!, {
        serialNumber: 'ASSIGNED',
        assignmentType: 'member',
        assignedToId: member.id,
      })

      const unassigned = await repo.unassign(badge.id)

      expect(unassigned.assignmentType).toBe('unassigned')
      expect(unassigned.assignedToId).toBeUndefined()
    })

    it('should throw error when badge does not exist', async () => {
      await expect(repo.unassign('a0ebe404-c5d1-41c6-b2da-0f647e49057f')).rejects.toThrow()
    })
  })

  describe('updateStatus', () => {
    it('should update badge status', async () => {
      const badge = await createBadge(testDb.prisma!, { status: 'active' })

      const updated = await repo.updateStatus(badge.id, 'inactive')

      expect(updated.status).toBe('inactive')
    })

    it('should throw error when badge does not exist', async () => {
      await expect(
        repo.updateStatus('a0ebe404-c5d1-41c6-b2da-0f647e49057f', 'inactive')
      ).rejects.toThrow()
    })
  })

  describe('delete', () => {
    it('should delete badge', async () => {
      const badge = await createBadge(testDb.prisma!)

      await repo.delete(badge.id)

      const found = await repo.findById(badge.id)
      expect(found).toBeNull()
    })

    it('should throw error when badge does not exist', async () => {
      await expect(repo.delete('a0ebe404-c5d1-41c6-b2da-0f647e49057f')).rejects.toThrow()
    })
  })

  describe('findBySerialNumberWithMember', () => {
    it('should find badge with assigned member', async () => {
      const division = await testDb.prisma!.division.findFirst()
      const member = await createMember(testDb.prisma!, {
        divisionId: division!.id,
        firstName: 'John',
        lastName: 'Doe',
      })
      const badge = await createBadge(testDb.prisma!, {
        serialNumber: 'MEMBER1',
        assignmentType: 'member',
        assignedToId: member.id,
      })

      // Update member to link the badge
      await testDb.prisma!.member.update({
        where: { id: member.id },
        data: { badgeId: badge.id },
      })

      const result = await repo.findBySerialNumberWithMember('MEMBER1')

      expect(result).toBeDefined()
      expect(result!.badge.serialNumber).toBe('MEMBER1')
      expect(result!.member).toBeDefined()
      expect(result!.member!.id).toBe(member.id)
      expect(result!.member!.firstName).toBe('John')
    })

    it('should return null member when badge is unassigned', async () => {
      await createBadge(testDb.prisma!, {
        serialNumber: 'UNASSIGNED',
        assignmentType: 'unassigned',
      })

      const result = await repo.findBySerialNumberWithMember('UNASSIGNED')

      expect(result).toBeDefined()
      expect(result!.badge.serialNumber).toBe('UNASSIGNED')
      expect(result!.member).toBeNull()
    })

    it('should return null when serial number does not exist', async () => {
      const result = await repo.findBySerialNumberWithMember('NONEXISTENT')
      expect(result).toBeNull()
    })
  })

  describe('findAllWithDetails', () => {
    it('should find all badges with member and scan details', async () => {
      const division = await testDb.prisma!.division.findFirst()
      const member = await createMember(testDb.prisma!, { divisionId: division!.id })
      const badge = await createBadge(testDb.prisma!, {
        serialNumber: 'DETAIL1',
        assignmentType: 'member',
        assignedToId: member.id,
      })

      // Update member to link badge
      await testDb.prisma!.member.update({
        where: { id: member.id },
        data: { badgeId: badge.id },
      })

      const badges = await repo.findAllWithDetails()

      expect(badges.length).toBeGreaterThan(0)
      const detailBadge = badges.find((b) => b.serialNumber === 'DETAIL1')
      expect(detailBadge).toBeDefined()
      expect(detailBadge!.assignedMember).toBeDefined()
      expect(detailBadge!.assignedMember!.id).toBe(member.id)
    })

    it('should apply status filter to details query', async () => {
      await createBadge(testDb.prisma!, { serialNumber: 'ACTIVE', status: 'active' })
      await createBadge(testDb.prisma!, { serialNumber: 'INACTIVE', status: 'inactive' })

      const badges = await repo.findAllWithDetails({ status: 'active' })

      expect(badges.every((b) => b.status === 'active')).toBe(true)
      expect(badges.some((b) => b.serialNumber === 'ACTIVE')).toBe(true)
      expect(badges.some((b) => b.serialNumber === 'INACTIVE')).toBe(false)
    })
  })
})
