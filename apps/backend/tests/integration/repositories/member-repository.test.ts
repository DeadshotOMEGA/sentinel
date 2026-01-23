import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { TestDatabase } from '../../helpers/testcontainers'
import {
  createMember,
  createDivision,
  createBadge,
  createTag,
  createCheckin,
} from '../../helpers/factories'
import { MemberRepository } from '@/repositories/member-repository'
import type {
  Member,
  CreateMemberInput,
  UpdateMemberInput,
  MemberFilterParams,
  PaginationParams,
} from '@sentinel/types'

describe('MemberRepository Integration Tests', () => {
  const testDb = new TestDatabase()
  let repo: MemberRepository

  beforeAll(async () => {
    await testDb.start()
    repo = new MemberRepository(testDb.prisma!)
  }, 60000)

  afterAll(async () => {
    await testDb.stop()
  })

  beforeEach(async () => {
    await testDb.reset()
    await testDb.seed() // Creates default divisions
  })

  describe('create', () => {
    it('should create a member with all required fields', async () => {
      const division = await testDb.prisma!.division.findFirst()
      expect(division).toBeDefined()

      const input: CreateMemberInput = {
        serviceNumber: 'A123456',
        firstName: 'John',
        lastName: 'Doe',
        rank: 'AB',
        divisionId: division!.id,
        memberType: 'reserve',
      }

      const member = await repo.create(input)

      expect(member).toBeDefined()
      expect(member.serviceNumber).toBe('A123456')
      expect(member.firstName).toBe('John')
      expect(member.lastName).toBe('Doe')
      expect(member.rank).toBe('AB')
      expect(member.divisionId).toBe(division!.id)
      expect(member.memberType).toBe('reserve')
      expect(member.status).toBe('active') // Default status
      expect(member.id).toBeDefined()
      expect(member.createdAt).toBeInstanceOf(Date)
      expect(member.updatedAt).toBeInstanceOf(Date)
    })

    it('should create a member with all optional fields', async () => {
      const division = await testDb.prisma!.division.findFirst()
      const badge = await createBadge(testDb.prisma!)

      const input: CreateMemberInput = {
        serviceNumber: 'A123456',
        employeeNumber: 'E7890',
        firstName: 'Jane',
        lastName: 'Smith',
        initials: 'JS',
        rank: 'MS',
        divisionId: division!.id,
        mess: 'Jr Ranks',
        moc: 'HT',
        memberType: 'regular',
        classDetails: 'Class A',
        status: 'inactive',
        email: 'jane.smith@navy.ca',
        homePhone: '555-0100',
        mobilePhone: '555-0101',
        badgeId: badge.id,
      }

      const member = await repo.create(input)

      expect(member.employeeNumber).toBe('E7890')
      expect(member.initials).toBe('JS')
      expect(member.mess).toBe('Jr Ranks')
      expect(member.moc).toBe('HT')
      expect(member.classDetails).toBe('Class A')
      expect(member.status).toBe('inactive')
      expect(member.email).toBe('jane.smith@navy.ca')
      expect(member.homePhone).toBe('555-0100')
      expect(member.mobilePhone).toBe('555-0101')
      expect(member.badgeId).toBe(badge.id)
    })

    it('should throw error on duplicate service number', async () => {
      const division = await testDb.prisma!.division.findFirst()
      const input: CreateMemberInput = {
        serviceNumber: 'A123456',
        firstName: 'John',
        lastName: 'Doe',
        rank: 'AB',
        divisionId: division!.id,
        memberType: 'reserve',
      }

      await repo.create(input)

      // Attempt to create duplicate
      await expect(repo.create(input)).rejects.toThrow()
    })

    it('should throw error when division does not exist', async () => {
      const input: CreateMemberInput = {
        serviceNumber: 'A123456',
        firstName: 'John',
        lastName: 'Doe',
        rank: 'AB',
        divisionId: 'a0ebe404-c5d1-41c6-b2da-0f647e49057f',
        memberType: 'reserve',
      }

      await expect(repo.create(input)).rejects.toThrow()
    })
  })

  describe('findById', () => {
    it('should find member by ID with division and badge', async () => {
      const division = await testDb.prisma!.division.findFirst()
      const badge = await createBadge(testDb.prisma!)
      const created = await createMember(testDb.prisma!, {
        badgeId: badge.id,
        divisionId: division!.id,
      })

      const found = await repo.findById(created.id)

      expect(found).toBeDefined()
      expect(found!.id).toBe(created.id)
      expect(found!.division).toBeDefined()
      expect(found!.division.id).toBe(division!.id)
      expect(found!.badge).toBeDefined()
      expect(found!.badge!.id).toBe(badge.id)
    })

    it('should return null when member does not exist', async () => {
      const found = await repo.findById('a0ebe404-c5d1-41c6-b2da-0f647e49057f')
      expect(found).toBeNull()
    })
  })

  describe('findByServiceNumber', () => {
    it('should find member by service number', async () => {
      const created = await createMember(testDb.prisma!, {
        serviceNumber: 'A999999',
      })

      const found = await repo.findByServiceNumber('A999999')

      expect(found).toBeDefined()
      expect(found!.id).toBe(created.id)
      expect(found!.serviceNumber).toBe('A999999')
    })

    it('should return null when service number does not exist', async () => {
      const found = await repo.findByServiceNumber('NONEXIST')
      expect(found).toBeNull()
    })
  })

  describe('update', () => {
    it('should update member basic fields', async () => {
      const member = await createMember(testDb.prisma!)

      const updates: UpdateMemberInput = {
        firstName: 'Updated',
        lastName: 'Name',
        rank: 'PO1',
      }

      const updated = await repo.update(member.id, updates)

      expect(updated.firstName).toBe('Updated')
      expect(updated.lastName).toBe('Name')
      expect(updated.rank).toBe('PO1')
      expect(updated.serviceNumber).toBe(member.serviceNumber) // Unchanged
    })

    it('should update member status', async () => {
      const member = await createMember(testDb.prisma!, { status: 'active' })

      const updated = await repo.update(member.id, { status: 'inactive' })

      expect(updated.status).toBe('inactive')
    })

    it('should update member division', async () => {
      const member = await createMember(testDb.prisma!)
      const newDivision = await createDivision(testDb.prisma!, {
        code: 'NEW',
        name: 'New Division',
      })

      const updated = await repo.update(member.id, { divisionId: newDivision.id })

      expect(updated.divisionId).toBe(newDivision.id)
    })

    it('should throw error when member does not exist', async () => {
      await expect(
        repo.update('a0ebe404-c5d1-41c6-b2da-0f647e49057f', { firstName: 'Test' })
      ).rejects.toThrow()
    })

    it('should throw error when updating to duplicate service number', async () => {
      await createMember(testDb.prisma!, { serviceNumber: 'A111111' })
      const member2 = await createMember(testDb.prisma!, { serviceNumber: 'A222222' })

      await expect(
        repo.update(member2.id, { serviceNumber: 'A111111' })
      ).rejects.toThrow()
    })
  })

  describe('delete', () => {
    it('should soft delete a member', async () => {
      const member = await createMember(testDb.prisma!, { status: 'active' })

      await repo.delete(member.id)

      const deleted = await testDb.prisma!.member.findUnique({
        where: { id: member.id },
      })

      expect(deleted).toBeDefined()
      expect(deleted!.status).toBe('inactive') // Soft delete sets status to inactive
    })

    it('should throw error when member does not exist', async () => {
      await expect(repo.delete('a0ebe404-c5d1-41c6-b2da-0f647e49057f')).rejects.toThrow()
    })
  })

  describe('findAll with filters', () => {
    beforeEach(async () => {
      // Create test data
      const div1 = await testDb.prisma!.division.findFirst()
      const div2 = await createDivision(testDb.prisma!, { code: 'DIV2', name: 'Division 2' })

      await createMember(testDb.prisma!, {
        divisionId: div1!.id,
        memberType: 'reserve',
        status: 'active',
        firstName: 'Alice',
        lastName: 'Anderson',
      })
      await createMember(testDb.prisma!, {
        divisionId: div1!.id,
        memberType: 'regular',
        status: 'active',
        firstName: 'Bob',
        lastName: 'Brown',
      })
      await createMember(testDb.prisma!, {
        divisionId: div2.id,
        memberType: 'reserve',
        status: 'inactive',
        firstName: 'Charlie',
        lastName: 'Clark',
      })
    })

    it('should find all members without filters', async () => {
      const members = await repo.findAll()
      expect(members.length).toBe(3)
      expect(members[0].division).toBeDefined()
    })

    it('should filter by division', async () => {
      const div1 = await testDb.prisma!.division.findFirst()
      const filters: MemberFilterParams = { divisionId: div1!.id }

      const members = await repo.findAll(filters)

      expect(members.length).toBe(2)
      expect(members.every((m: Member) => m.divisionId === div1!.id)).toBe(true)
    })

    it('should filter by member type', async () => {
      const filters: MemberFilterParams = { memberType: 'reserve' }

      const members = await repo.findAll(filters)

      expect(members.length).toBe(2)
      expect(members.every((m: Member) => m.memberType === 'reserve')).toBe(true)
    })

    it('should filter by status', async () => {
      const filters: MemberFilterParams = { status: 'active' }

      const members = await repo.findAll(filters)

      expect(members.length).toBe(2)
      expect(members.every((m: Member) => m.status === 'active')).toBe(true)
    })

    it('should search by name', async () => {
      const filters: MemberFilterParams = { search: 'alice' }

      const members = await repo.findAll(filters)

      expect(members.length).toBe(1)
      expect(members[0].firstName).toBe('Alice')
    })

    it('should search by service number', async () => {
      await createMember(testDb.prisma!, { serviceNumber: 'SEARCH123' })
      const filters: MemberFilterParams = { search: 'SEARCH123' }

      const members = await repo.findAll(filters)

      expect(members.length).toBe(1)
      expect(members[0].serviceNumber).toBe('SEARCH123')
    })

    it('should combine multiple filters', async () => {
      const div1 = await testDb.prisma!.division.findFirst()
      const filters: MemberFilterParams = {
        divisionId: div1!.id,
        memberType: 'reserve',
        status: 'active',
      }

      const members = await repo.findAll(filters)

      expect(members.length).toBe(1)
      expect(members[0].firstName).toBe('Alice')
    })
  })

  describe('findPaginated', () => {
    beforeEach(async () => {
      // Create 15 test members
      for (let i = 0; i < 15; i++) {
        await createMember(testDb.prisma!, {
          serviceNumber: `A${100000 + i}`,
          firstName: `Member${i}`,
          lastName: `Test${i}`,
        })
      }
    })

    it('should paginate results with default page size', async () => {
      const params: PaginationParams = { page: 1, limit: 10 }

      const result = await repo.findPaginated(params)

      expect(result.members.length).toBe(10)
      expect(result.total).toBe(15)
    })

    it('should return second page of results', async () => {
      const params: PaginationParams = { page: 2, limit: 10 }

      const result = await repo.findPaginated(params)

      expect(result.members.length).toBe(5)
      expect(result.total).toBe(15)
    })

    it('should sort by field ascending', async () => {
      const params: PaginationParams = {
        page: 1,
        limit: 10,
        sortBy: 'firstName',
        sortOrder: 'asc',
      }

      const result = await repo.findPaginated(params)

      expect(result.members[0].firstName).toBe('Member0')
      expect(result.members[1].firstName).toBe('Member1')
    })

    it('should sort by field descending', async () => {
      const params: PaginationParams = {
        page: 1,
        limit: 10,
        sortBy: 'firstName',
        sortOrder: 'desc',
      }

      const result = await repo.findPaginated(params)

      expect(result.members[0].firstName).toBe('Member9')
      expect(result.members[1].firstName).toBe('Member8')
    })

    it('should combine pagination with filters', async () => {
      const params: PaginationParams = { page: 1, limit: 5 }
      const filters: MemberFilterParams = { status: 'active' }

      const result = await repo.findPaginated(params, filters)

      expect(result.members.length).toBeLessThanOrEqual(5)
      expect(result.members.every((m: Member) => m.status === 'active')).toBe(true)
    })
  })

  describe('findByIds', () => {
    it('should find multiple members by IDs', async () => {
      const member1 = await createMember(testDb.prisma!)
      const member2 = await createMember(testDb.prisma!)
      const member3 = await createMember(testDb.prisma!)

      const found = await repo.findByIds([member1.id, member2.id, member3.id])

      expect(found.length).toBe(3)
      expect(found.map((m: Member) => m.id).sort()).toEqual(
        [member1.id, member2.id, member3.id].sort()
      )
    })

    it('should return empty array when no IDs provided', async () => {
      const found = await repo.findByIds([])
      expect(found).toEqual([])
    })

    it('should skip non-existent IDs', async () => {
      const member1 = await createMember(testDb.prisma!)

      const found = await repo.findByIds([member1.id, 'a0ebe404-c5d1-41c6-b2da-0f647e49057f'])

      expect(found.length).toBe(1)
      expect(found[0].id).toBe(member1.id)
    })
  })

  describe('findByServiceNumbers', () => {
    it('should find multiple members by service numbers', async () => {
      await createMember(testDb.prisma!, { serviceNumber: 'SN1' })
      await createMember(testDb.prisma!, { serviceNumber: 'SN2' })
      await createMember(testDb.prisma!, { serviceNumber: 'SN3' })

      const found = await repo.findByServiceNumbers(['SN1', 'SN2', 'SN3'])

      expect(found.length).toBe(3)
      expect(found.map((m: Member) => m.serviceNumber).sort()).toEqual(['SN1', 'SN2', 'SN3'])
    })

    it('should return empty array when no service numbers provided', async () => {
      const found = await repo.findByServiceNumbers([])
      expect(found).toEqual([])
    })
  })

  describe('bulkCreate', () => {
    it('should create multiple members in one transaction', async () => {
      const division = await testDb.prisma!.division.findFirst()

      const inputs: CreateMemberInput[] = [
        {
          serviceNumber: 'BULK1',
          firstName: 'Bulk',
          lastName: 'One',
          rank: 'AB',
          divisionId: division!.id,
          memberType: 'reserve',
        },
        {
          serviceNumber: 'BULK2',
          firstName: 'Bulk',
          lastName: 'Two',
          rank: 'LS',
          divisionId: division!.id,
          memberType: 'reserve',
        },
      ]

      const count = await repo.bulkCreate(inputs)

      expect(count).toBe(2)

      // Verify members were created
      const member1 = await testDb.prisma!.member.findUnique({
        where: { serviceNumber: 'BULK1' },
      })
      const member2 = await testDb.prisma!.member.findUnique({
        where: { serviceNumber: 'BULK2' },
      })

      expect(member1).toBeDefined()
      expect(member2).toBeDefined()
    })

    it('should rollback entire transaction on error', async () => {
      const division = await testDb.prisma!.division.findFirst()
      await createMember(testDb.prisma!, { serviceNumber: 'EXISTING' })

      const inputs: CreateMemberInput[] = [
        {
          serviceNumber: 'BULK1',
          firstName: 'Bulk',
          lastName: 'One',
          rank: 'AB',
          divisionId: division!.id,
          memberType: 'reserve',
        },
        {
          serviceNumber: 'EXISTING', // Duplicate
          firstName: 'Bulk',
          lastName: 'Two',
          rank: 'LS',
          divisionId: division!.id,
          memberType: 'reserve',
        },
      ]

      await expect(repo.bulkCreate(inputs)).rejects.toThrow()

      // Verify BULK1 was not created (transaction rolled back)
      const member = await testDb.prisma!.member.findFirst({
        where: { serviceNumber: 'BULK1' },
      })
      expect(member).toBeNull()
    })
  })

  describe('bulkUpdate', () => {
    it('should update multiple members in one transaction', async () => {
      const member1 = await createMember(testDb.prisma!, { status: 'active' })
      const member2 = await createMember(testDb.prisma!, { status: 'active' })

      const updates = [
        { id: member1.id, status: 'inactive' as const },
        { id: member2.id, status: 'transferred' as const },
      ]

      const count = await repo.bulkUpdate(updates)

      expect(count).toBe(2)

      // Verify updates were applied
      const updated1 = await testDb.prisma!.member.findUnique({
        where: { id: member1.id },
      })
      const updated2 = await testDb.prisma!.member.findUnique({
        where: { id: member2.id },
      })

      expect(updated1!.status).toBe('inactive')
      expect(updated2!.status).toBe('transferred')
    })

    it('should rollback on error', async () => {
      const member1 = await createMember(testDb.prisma!, { status: 'active' })

      const updates = [
        { id: member1.id, status: 'inactive' as const },
        { id: 'a0ebe404-c5d1-41c6-b2da-0f647e49057f', status: 'inactive' as const },
      ]

      await expect(repo.bulkUpdate(updates)).rejects.toThrow()

      // Verify member1 was not updated (transaction rolled back)
      const member = await testDb.prisma!.member.findUnique({
        where: { id: member1.id },
      })
      expect(member!.status).toBe('active')
    })
  })

  describe('tag management', () => {
    it('should add tag to member', async () => {
      const member = await createMember(testDb.prisma!)
      const tag = await createTag(testDb.prisma!, { name: 'VIP' })

      await repo.addTag(member.id, tag.id)

      const updated = await repo.findById(member.id)
      expect(updated!.tags).toBeDefined()
      expect(updated!.tags!.length).toBe(1)
      expect(updated!.tags![0].id).toBe(tag.id)
    })

    it('should add multiple tags to member', async () => {
      const member = await createMember(testDb.prisma!)
      const tag1 = await createTag(testDb.prisma!, { name: 'VIP' })
      const tag2 = await createTag(testDb.prisma!, { name: 'Instructor' })

      await repo.addTag(member.id, tag1.id)
      await repo.addTag(member.id, tag2.id)

      const updated = await repo.findById(member.id)
      expect(updated!.tags!.length).toBe(2)
    })

    it('should not duplicate tags', async () => {
      const member = await createMember(testDb.prisma!)
      const tag = await createTag(testDb.prisma!, { name: 'VIP' })

      await repo.addTag(member.id, tag.id)
      await repo.addTag(member.id, tag.id) // Add again

      const updated = await repo.findById(member.id)
      expect(updated!.tags!.length).toBe(1) // Still only one
    })

    it('should remove tag from member', async () => {
      const member = await createMember(testDb.prisma!)
      const tag = await createTag(testDb.prisma!, { name: 'VIP' })

      await repo.addTag(member.id, tag.id)
      await repo.removeTag(member.id, tag.id)

      const updated = await repo.findById(member.id)
      expect(updated!.tags!.length).toBe(0)
    })

    it('should filter members by tags', async () => {
      const tag1 = await createTag(testDb.prisma!, { name: 'VIP' })
      const tag2 = await createTag(testDb.prisma!, { name: 'Instructor' })

      const member1 = await createMember(testDb.prisma!)
      const member2 = await createMember(testDb.prisma!)

      await repo.addTag(member1.id, tag1.id)
      await repo.addTag(member2.id, tag1.id)
      await repo.addTag(member2.id, tag2.id)

      const filters: MemberFilterParams = { tags: ['VIP'] }
      const members = await repo.findAll(filters)

      expect(members.length).toBe(2)
      expect(members.map((m: Member) => m.id).sort()).toEqual([member1.id, member2.id].sort())
    })

    it('should exclude members by tags', async () => {
      const tag = await createTag(testDb.prisma!, { name: 'Exclude' })

      const member1 = await createMember(testDb.prisma!)
      const member2 = await createMember(testDb.prisma!)

      await repo.addTag(member1.id, tag.id)

      const filters: MemberFilterParams = { excludeTags: ['Exclude'] }
      const members = await repo.findAll(filters)

      expect(members.some((m: Member) => m.id === member1.id)).toBe(false)
      expect(members.some((m: Member) => m.id === member2.id)).toBe(true)
    })
  })

  describe('flagForReview', () => {
    it('should flag member for review', async () => {
      const member = await createMember(testDb.prisma!, { status: 'active' })

      await repo.flagForReview([member.id])

      const updated = await testDb.prisma!.member.findUnique({
        where: { id: member.id },
      })

      expect(updated!.status).toBe('pending_review')
    })
  })

  describe('clearBadgeReference', () => {
    it('should clear badge reference from member', async () => {
      const badge = await createBadge(testDb.prisma!)
      const member = await createMember(testDb.prisma!, { badgeId: badge.id })

      await repo.clearBadgeReference(badge.id)

      const updated = await testDb.prisma!.member.findUnique({
        where: { id: member.id },
      })

      expect(updated!.badgeId).toBeNull()
    })
  })

  describe('getPresenceStatus', () => {
    it('should return absent when no checkins exist', async () => {
      const member = await createMember(testDb.prisma!)

      const status = await repo.getPresenceStatus(member.id)

      expect(status).toBe('absent')
    })

    it('should return present when last checkin is IN', async () => {
      const badge = await createBadge(testDb.prisma!)
      const member = await createMember(testDb.prisma!, { badgeId: badge.id })

      await createCheckin(testDb.prisma!, {
        badgeId: badge.id,
        direction: 'IN',
        scannedAt: new Date(),
      })

      const status = await repo.getPresenceStatus(member.id)

      expect(status).toBe('present')
    })

    it('should return absent when last checkin is OUT', async () => {
      const badge = await createBadge(testDb.prisma!)
      const member = await createMember(testDb.prisma!, { badgeId: badge.id })

      await createCheckin(testDb.prisma!, {
        badgeId: badge.id,
        direction: 'IN',
        scannedAt: new Date(Date.now() - 10000),
      })

      await createCheckin(testDb.prisma!, {
        badgeId: badge.id,
        direction: 'OUT',
        scannedAt: new Date(),
      })

      const status = await repo.getPresenceStatus(member.id)

      expect(status).toBe('absent')
    })

    it('should return absent for member with no badge', async () => {
      const member = await createMember(testDb.prisma!, { badgeId: null })

      const status = await repo.getPresenceStatus(member.id)

      expect(status).toBe('absent')
    })
  })

  describe('Additional edge cases for coverage', () => {
    describe('tag management edge cases', () => {
      it('should handle removing non-existent tag gracefully', async () => {
        const tag = await createTag(testDb.prisma!)
        const member = await createMember(testDb.prisma!)

        // Try to remove tag that was never added
        await repo.removeTag(member.id, tag.id)

        // Should not throw, just no-op
        const result = await repo.findById(member.id)
        expect(result).toBeDefined()
      })

      it('should handle adding tag to multiple members', async () => {
        const tag = await createTag(testDb.prisma!)
        const member1 = await createMember(testDb.prisma!)
        const member2 = await createMember(testDb.prisma!)

        await repo.addTag(member1.id, tag.id)
        await repo.addTag(member2.id, tag.id)

        const members = await repo.findByTags([tag.id])

        expect(members).toHaveLength(2)
      })
    })

    describe('filter edge cases', () => {
      it('should handle empty search string', async () => {
        const member = await createMember(testDb.prisma!)

        const results = await repo.findAll({ search: '' })

        expect(results).toHaveLength(1)
        expect(results[0].id).toBe(member.id)
      })

      it('should return empty array when no members match combined filters', async () => {
        await createMember(testDb.prisma!, { status: 'active' })

        const results = await repo.findAll({
          status: 'inactive',
          divisionId: 'a0ebe404-c5d1-41c6-b2da-0f647e49057f',
        })

        expect(results).toEqual([])
      })

      it('should handle null badge in filters', async () => {
        const member1 = await createMember(testDb.prisma!, { badgeId: null })
        const badge = await createBadge(testDb.prisma!)
        await createMember(testDb.prisma!, { badgeId: badge.id })

        const results = await repo.findAll({ hasBadge: false })

        expect(results).toHaveLength(1)
        expect(results[0].id).toBe(member1.id)
      })
    })

    describe('pagination edge cases', () => {
      it('should return empty array for page beyond total pages', async () => {
        await createMember(testDb.prisma!)

        const result = await repo.findPaginated({
          page: 100,
          limit: 10,
        })

        expect(result.members).toEqual([])
        expect(result.total).toBe(1)
        expect(result.totalPages).toBe(1)
      })

      it('should handle limit of 1', async () => {
        await createMember(testDb.prisma!)
        await createMember(testDb.prisma!)

        const result = await repo.findPaginated({
          page: 1,
          limit: 1,
        })

        expect(result.members).toHaveLength(1)
        expect(result.total).toBe(2)
        expect(result.totalPages).toBe(2)
      })

      it('should reject very large limit', async () => {
        await createMember(testDb.prisma!)
        await createMember(testDb.prisma!)

        await expect(
          repo.findPaginated({
            page: 1,
            limit: 1000,
          })
        ).rejects.toThrow('Invalid limit: must be between 1 and 100')
      })
    })

    describe('batch operation edge cases', () => {
      it('should handle empty array in bulkCreate', async () => {
        const result = await repo.bulkCreate([])

        expect(result).toBe(0)
      })

      it('should handle single item in bulkUpdate', async () => {
        const member = await createMember(testDb.prisma!, { rank: 'AB' })

        const result = await repo.bulkUpdate([
          {
            id: member.id,
            rank: 'LS',
          },
        ])

        expect(result).toBe(1)

        const updated = await repo.findById(member.id)
        expect(updated?.rank).toBe('LS')
      })

      it('should handle bulkUpdate with no updates needed', async () => {
        const member = await createMember(testDb.prisma!, { rank: 'AB' })

        // Update to same value
        const result = await repo.bulkUpdate([
          {
            id: member.id,
            rank: 'AB',
          },
        ])

        expect(result).toBe(1)
      })
    })

    describe('findByServiceNumbers edge cases', () => {
      it('should handle duplicate service numbers in input', async () => {
        const member = await createMember(testDb.prisma!, { serviceNumber: 'SN001' })

        const results = await repo.findByServiceNumbers(['SN001', 'SN001'])

        // Should deduplicate
        expect(results).toHaveLength(1)
        expect(results[0].id).toBe(member.id)
      })

      it('should handle mix of existing and non-existing service numbers', async () => {
        const member = await createMember(testDb.prisma!, { serviceNumber: 'SN001' })

        const results = await repo.findByServiceNumbers(['SN001', 'NON_EXISTENT'])

        expect(results).toHaveLength(1)
        expect(results[0].id).toBe(member.id)
      })
    })

    describe('flagForReview edge cases', () => {
      it('should handle flagging multiple members', async () => {
        const member1 = await createMember(testDb.prisma!, { status: 'active' })
        const member2 = await createMember(testDb.prisma!, { status: 'active' })

        await repo.flagForReview([member1.id, member2.id])

        const updated1 = await testDb.prisma!.member.findUnique({
          where: { id: member1.id },
        })
        const updated2 = await testDb.prisma!.member.findUnique({
          where: { id: member2.id },
        })

        expect(updated1!.status).toBe('pending_review')
        expect(updated2!.status).toBe('pending_review')
      })

      it('should handle empty array in flagForReview', async () => {
        await repo.flagForReview([])
        // Should not throw
      })
    })

    describe('clearBadgeReference edge cases', () => {
      it('should handle clearing badge for multiple members', async () => {
        const badge = await createBadge(testDb.prisma!)
        const member1 = await createMember(testDb.prisma!, { badgeId: badge.id })
        const member2 = await createMember(testDb.prisma!, { badgeId: badge.id })

        await repo.clearBadgeReference(badge.id)

        const updated1 = await testDb.prisma!.member.findUnique({
          where: { id: member1.id },
        })
        const updated2 = await testDb.prisma!.member.findUnique({
          where: { id: member2.id },
        })

        expect(updated1!.badgeId).toBeNull()
        expect(updated2!.badgeId).toBeNull()
      })

      it('should handle clearing badge that has no members', async () => {
        const badge = await createBadge(testDb.prisma!)

        await repo.clearBadgeReference(badge.id)

        // Should not throw
      })
    })
  })
})
