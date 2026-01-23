import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { TestDatabase } from '../../helpers/testcontainers'
import {
  createVisitor,
  createMember,
  createBadge,
  createEvent,
} from '../../helpers/factories'
import { VisitorRepository } from '@/repositories/visitor-repository'
import type { Visitor } from '@sentinel/types'

describe('VisitorRepository Integration Tests', () => {
  const testDb = new TestDatabase()
  let repo: VisitorRepository

  beforeAll(async () => {
    await testDb.start()
    repo = new VisitorRepository(testDb.prisma!)
  }, 60000)

  afterAll(async () => {
    await testDb.stop()
  })

  beforeEach(async () => {
    await testDb.reset()
    await testDb.seed()
  })

  describe('create', () => {
    it('should create visitor with all required fields', async () => {
      const visitor = await repo.create({
        name: 'John Visitor',
        organization: 'Test Org',
        visitType: 'official',
        purpose: 'Meeting',
        checkInTime: new Date(),
      })

      expect(visitor.id).toBeDefined()
      expect(visitor.name).toBe('John Visitor')
      expect(visitor.organization).toBe('Test Org')
      expect(visitor.visitType).toBe('official')
    })

    it('should create visitor with host member', async () => {
      const member = await createMember(testDb.prisma!)

      const visitor = await repo.create({
        name: 'Jane Visitor',
        organization: 'External',
        visitType: 'official',
        hostMemberId: member.id,
        checkInTime: new Date(),
      })

      expect(visitor.hostMemberId).toBe(member.id)
    })

    it('should create visitor for event', async () => {
      const event = await createEvent(testDb.prisma!)

      const visitor = await repo.create({
        name: 'Event Visitor',
        organization: 'Event Org',
        visitType: 'event',
        eventId: event.id,
        checkInTime: new Date(),
      })

      expect(visitor.eventId).toBe(event.id)
    })

    it('should default checkInTime to now if not provided', async () => {
      const before = new Date()
      const visitor = await repo.create({
        name: 'Auto Time Visitor',
        organization: 'Test',
        visitType: 'official',
      })
      const after = new Date()

      const checkInTime = new Date(visitor.checkInTime)
      expect(checkInTime.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(checkInTime.getTime()).toBeLessThanOrEqual(after.getTime())
    })

    it('should throw error when host member does not exist', async () => {
      await expect(
        repo.create({
          name: 'Visitor',
          organization: 'Test',
          visitType: 'official',
          hostMemberId: 'non-existent',
          checkInTime: new Date(),
        })
      ).rejects.toThrow()
    })

    it('should throw error when event does not exist', async () => {
      await expect(
        repo.create({
          name: 'Visitor',
          organization: 'Test',
          visitType: 'event',
          eventId: 'non-existent',
          checkInTime: new Date(),
        })
      ).rejects.toThrow()
    })
  })

  describe('findById', () => {
    it('should find visitor by ID with relations', async () => {
      const member = await createMember(testDb.prisma!)
      const created = await createVisitor(testDb.prisma!, {
        hostMemberId: member.id,
      })

      const found = await repo.findById(created.id)

      expect(found).toBeDefined()
      expect(found?.id).toBe(created.id)
      expect(found?.name).toBe(created.name)
    })

    it('should return null when visitor does not exist', async () => {
      const found = await repo.findById('non-existent-id')

      expect(found).toBeNull()
    })
  })

  describe('findAll', () => {
    it('should find all visitors', async () => {
      await createVisitor(testDb.prisma!)
      await createVisitor(testDb.prisma!)

      const visitors = await repo.findAll()

      expect(visitors.length).toBeGreaterThanOrEqual(2)
    })

    it('should filter by visit type', async () => {
      await createVisitor(testDb.prisma!, { visitType: 'official' })
      await createVisitor(testDb.prisma!, { visitType: 'casual' })

      const visitors = await repo.findAll({ visitType: 'official' })

      expect(visitors).toHaveLength(1)
      expect(visitors[0].visitType).toBe('official')
    })

    it('should filter by host member', async () => {
      const member1 = await createMember(testDb.prisma!)
      const member2 = await createMember(testDb.prisma!)

      await createVisitor(testDb.prisma!, { hostMemberId: member1.id })
      await createVisitor(testDb.prisma!, { hostMemberId: member2.id })

      const visitors = await repo.findAll({ hostMemberId: member1.id })

      expect(visitors).toHaveLength(1)
      expect(visitors[0].hostMemberId).toBe(member1.id)
    })

    it('should filter by date range', async () => {
      const now = new Date()
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

      await createVisitor(testDb.prisma!, {
        checkInTime: yesterday,
      })
      await createVisitor(testDb.prisma!, {
        checkInTime: now,
      })

      const visitors = await repo.findAll({
        dateRange: {
          start: new Date(now.getTime() - 1000),
          end: tomorrow,
        },
      })

      expect(visitors).toHaveLength(1)
    })

    it('should return empty array when no matches', async () => {
      const visitors = await repo.findAll({ visitType: 'NON_EXISTENT' })

      expect(visitors).toEqual([])
    })
  })

  describe('findActive', () => {
    it('should find visitors who have not checked out', async () => {
      await createVisitor(testDb.prisma!, {
        checkInTime: new Date(),
      })

      const active = await repo.findActive()

      expect(active.length).toBeGreaterThanOrEqual(1)
      active.forEach((visitor: Visitor) => {
        expect(visitor.checkOutTime).toBeUndefined()
      })
    })

    it('should not include checked out visitors', async () => {
      const visitor = await createVisitor(testDb.prisma!)

      await testDb.prisma!.visitor.update({
        where: { id: visitor.id },
        data: { checkOutTime: new Date() },
      })

      const active = await repo.findActive()

      const found = active.find((v: Visitor) => v.id === visitor.id)
      expect(found).toBeUndefined()
    })

    it('should return empty array when no active visitors', async () => {
      const active = await repo.findActive()

      expect(active).toEqual([])
    })
  })

  describe('findActiveWithRelations', () => {
    it('should include host member name', async () => {
      const member = await createMember(testDb.prisma!, {
        firstName: 'Host',
        lastName: 'Member',
      })

      await createVisitor(testDb.prisma!, {
        hostMemberId: member.id,
      })

      const active = await repo.findActiveWithRelations()

      expect(active.length).toBeGreaterThanOrEqual(1)

      const withHost = active.find((v: Visitor) => v.hostMemberId === member.id)
      if (withHost) {
        expect(withHost.hostName).toBeDefined()
      }
    })

    it('should include event name', async () => {
      const event = await createEvent(testDb.prisma!, {
        name: 'Test Event',
      })

      await createVisitor(testDb.prisma!, {
        eventId: event.id,
      })

      const active = await repo.findActiveWithRelations()

      const withEvent = active.find((v: Visitor) => v.eventId === event.id)
      if (withEvent) {
        expect(withEvent.eventName).toBe('Test Event')
      }
    })
  })

  describe('update', () => {
    it('should update visitor details', async () => {
      const visitor = await createVisitor(testDb.prisma!)
      const member = await createMember(testDb.prisma!)

      const updated = await repo.update(visitor.id, {
        hostMemberId: member.id,
        purpose: 'Updated purpose',
      })

      expect(updated.hostMemberId).toBe(member.id)
      expect(updated.purpose).toBe('Updated purpose')
    })

    it('should throw error when visitor does not exist', async () => {
      await expect(
        repo.update('non-existent-id', {
          purpose: 'Test',
        })
      ).rejects.toThrow()
    })

    it('should allow updating to null values', async () => {
      const member = await createMember(testDb.prisma!)
      const visitor = await createVisitor(testDb.prisma!, {
        hostMemberId: member.id,
      })

      const updated = await repo.update(visitor.id, {
        hostMemberId: null,
      })

      expect(updated.hostMemberId).toBeNull()
    })
  })

  describe('checkout', () => {
    it('should set checkout time', async () => {
      const visitor = await createVisitor(testDb.prisma!)

      const before = new Date()
      const checkedOut = await repo.checkout(visitor.id)
      const after = new Date()

      expect(checkedOut.checkOutTime).toBeDefined()

      if (checkedOut.checkOutTime) {
        const checkOutTime = new Date(checkedOut.checkOutTime)
        expect(checkOutTime.getTime()).toBeGreaterThanOrEqual(before.getTime())
        expect(checkOutTime.getTime()).toBeLessThanOrEqual(after.getTime())
      }
    })

    it('should throw error when visitor does not exist', async () => {
      await expect(repo.checkout('non-existent-id')).rejects.toThrow()
    })

    it('should allow checking out already checked out visitor', async () => {
      const visitor = await createVisitor(testDb.prisma!)

      await repo.checkout(visitor.id)
      const checkedOutAgain = await repo.checkout(visitor.id)

      expect(checkedOutAgain.checkOutTime).toBeDefined()
    })
  })

  describe('getActiveCount', () => {
    it('should return count of active visitors', async () => {
      await createVisitor(testDb.prisma!)
      await createVisitor(testDb.prisma!)

      const count = await repo.getActiveCount()

      expect(count).toBeGreaterThanOrEqual(2)
    })

    it('should not count checked out visitors', async () => {
      const visitor = await createVisitor(testDb.prisma!)

      const countBefore = await repo.getActiveCount()

      await repo.checkout(visitor.id)

      const countAfter = await repo.getActiveCount()

      expect(countAfter).toBe(countBefore - 1)
    })

    it('should return 0 when no active visitors', async () => {
      const count = await repo.getActiveCount()

      expect(count).toBe(0)
    })
  })

  describe('findHistory', () => {
    it('should find visitor history with pagination', async () => {
      for (let i = 0; i < 5; i++) {
        await createVisitor(testDb.prisma!)
      }

      const result = await repo.findHistory(
        {},
        { page: 1, limit: 2 }
      )

      expect(result.items).toHaveLength(2)
      expect(result.total).toBe(5)
    })

    it('should filter by name', async () => {
      await createVisitor(testDb.prisma!, { name: 'John Doe' })
      await createVisitor(testDb.prisma!, { name: 'Jane Smith' })

      const result = await repo.findHistory(
        { name: 'John' },
        { page: 1, limit: 10 }
      )

      expect(result.items).toHaveLength(1)
      expect(result.items[0].name).toContain('John')
    })

    it('should filter by organization', async () => {
      await createVisitor(testDb.prisma!, { organization: 'Company A' })
      await createVisitor(testDb.prisma!, { organization: 'Company B' })

      const result = await repo.findHistory(
        { organization: 'Company A' },
        { page: 1, limit: 10 }
      )

      expect(result.items).toHaveLength(1)
      expect(result.items[0].organization).toBe('Company A')
    })

    it('should return empty when no matches', async () => {
      const result = await repo.findHistory(
        { name: 'NON_EXISTENT' },
        { page: 1, limit: 10 }
      )

      expect(result.items).toEqual([])
      expect(result.total).toBe(0)
    })

    it('should handle pagination beyond available pages', async () => {
      await createVisitor(testDb.prisma!)

      const result = await repo.findHistory(
        {},
        { page: 100, limit: 10 }
      )

      expect(result.items).toEqual([])
      expect(result.total).toBe(1)
    })
  })

  describe('edge cases', () => {
    it('should handle visitor with badge', async () => {
      const badge = await createBadge(testDb.prisma!)
      const visitor = await createVisitor(testDb.prisma!, {
        temporaryBadgeId: badge.id,
      })

      const found = await repo.findById(visitor.id)

      expect(found?.temporaryBadgeId).toBe(badge.id)
    })

    it('should handle visitor without host or event', async () => {
      const visitor = await createVisitor(testDb.prisma!, {
        hostMemberId: null,
        eventId: null,
      })

      const found = await repo.findById(visitor.id)

      expect(found).toBeDefined()
      expect(found?.hostMemberId).toBeNull()
      expect(found?.eventId).toBeNull()
    })

    it('should handle multiple visitors with same host', async () => {
      const member = await createMember(testDb.prisma!)

      await createVisitor(testDb.prisma!, { hostMemberId: member.id })
      await createVisitor(testDb.prisma!, { hostMemberId: member.id })

      const visitors = await repo.findAll({ hostMemberId: member.id })

      expect(visitors).toHaveLength(2)
    })
  })
})
