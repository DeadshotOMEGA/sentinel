import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { TestDatabase } from '../../helpers/testcontainers'
import { ListItemRepository } from '../../../src/repositories/list-item-repository'
import type { CreateListItemInput, UpdateListItemInput, ListType } from '@sentinel/types'

describe('ListItemRepository Integration Tests', () => {
  const testDb = new TestDatabase()
  let repo: ListItemRepository

  beforeAll(async () => {
    await testDb.start()
    repo = new ListItemRepository(testDb.prisma!)
  }, 60000)

  afterAll(async () => {
    await testDb.stop()
  })

  beforeEach(async () => {
    await testDb.reset()
  })

  describe('create', () => {
    it('should create a list item with all fields', async () => {
      const input: CreateListItemInput = {
        code: 'AB',
        name: 'Able Seaman',
        description: 'Entry level rank',
        displayOrder: 1,
        isSystem: true,
      }

      const item = await repo.create('rank', input)

      expect(item.id).toBeDefined()
      expect(item.listType).toBe('rank')
      expect(item.code).toBe('AB')
      expect(item.name).toBe('Able Seaman')
      expect(item.description).toBe('Entry level rank')
      expect(item.displayOrder).toBe(1)
      expect(item.isSystem).toBe(true)
      expect(item.createdAt).toBeInstanceOf(Date)
      expect(item.updatedAt).toBeInstanceOf(Date)
    })

    it('should create list item without optional fields', async () => {
      const input: CreateListItemInput = {
        code: 'CUSTOM',
        name: 'Custom Item',
      }

      const item = await repo.create('event_role', input)

      expect(item.code).toBe('CUSTOM')
      expect(item.name).toBe('Custom Item')
      expect(item.description).toBeUndefined()
      expect(item.isSystem).toBe(false)
    })

    it('should auto-increment display order', async () => {
      await repo.create('rank', { code: 'AB', name: 'Able Seaman' })
      await repo.create('rank', { code: 'LS', name: 'Leading Seaman' })
      const item3 = await repo.create('rank', { code: 'MS', name: 'Master Seaman' })

      expect(item3.displayOrder).toBe(3)
    })

    it('should respect custom display order', async () => {
      await repo.create('rank', { code: 'AB', name: 'Able Seaman' })
      const item = await repo.create('rank', {
        code: 'CPO',
        name: 'Chief Petty Officer',
        displayOrder: 10,
      })

      expect(item.displayOrder).toBe(10)
    })

    it('should allow same code in different list types', async () => {
      await repo.create('rank', { code: 'CODE', name: 'Rank Code' })
      const item = await repo.create('mess', { code: 'CODE', name: 'Mess Code' })

      expect(item.code).toBe('CODE')
      expect(item.listType).toBe('mess')
    })
  })

  describe('findByType', () => {
    it('should return empty array when no items exist', async () => {
      const items = await repo.findByType('rank')
      expect(items).toEqual([])
    })

    it('should return only items of specified type', async () => {
      await repo.create('rank', { code: 'AB', name: 'Able Seaman' })
      await repo.create('mess', { code: 'JR', name: 'Junior Ranks' })
      await repo.create('rank', { code: 'LS', name: 'Leading Seaman' })

      const rankItems = await repo.findByType('rank')

      expect(rankItems).toHaveLength(2)
      expect(rankItems.every((item) => item.listType === 'rank')).toBe(true)
    })

    it('should return items ordered by displayOrder then name', async () => {
      await repo.create('rank', { code: 'C', name: 'Charlie', displayOrder: 2 })
      await repo.create('rank', { code: 'A', name: 'Alpha', displayOrder: 1 })
      await repo.create('rank', { code: 'B', name: 'Bravo', displayOrder: 1 })

      const items = await repo.findByType('rank')

      expect(items).toHaveLength(3)
      expect(items[0].name).toBe('Alpha') // Same displayOrder, sorted by name
      expect(items[1].name).toBe('Bravo')
      expect(items[2].name).toBe('Charlie')
    })
  })

  describe('findById', () => {
    it('should find existing list item by ID', async () => {
      const created = await repo.create('rank', {
        code: 'TEST',
        name: 'Test Item',
      })

      const found = await repo.findById(created.id)

      expect(found).toBeDefined()
      expect(found?.id).toBe(created.id)
      expect(found?.code).toBe('TEST')
    })

    it('should return null when item does not exist', async () => {
      const found = await repo.findById('550e8400-e29b-41d4-a716-446655440000')
      expect(found).toBeNull()
    })

    it('should handle invalid UUID format', async () => {
      await expect(repo.findById('invalid-uuid')).rejects.toThrow()
    })
  })

  describe('findByTypeAndCode', () => {
    it('should find existing list item by type and code', async () => {
      await repo.create('rank', {
        code: 'AB',
        name: 'Able Seaman',
      })

      const found = await repo.findByTypeAndCode('rank', 'AB')

      expect(found).toBeDefined()
      expect(found?.code).toBe('AB')
      expect(found?.listType).toBe('rank')
    })

    it('should return null when code does not exist in type', async () => {
      const found = await repo.findByTypeAndCode('rank', 'NONEXISTENT')
      expect(found).toBeNull()
    })

    it('should return null when code exists in different type', async () => {
      await repo.create('rank', { code: 'CODE', name: 'Rank Code' })

      const found = await repo.findByTypeAndCode('mess', 'CODE')
      expect(found).toBeNull()
    })
  })

  describe('update', () => {
    it('should update item code', async () => {
      const created = await repo.create('rank', {
        code: 'OLD',
        name: 'Old Code',
      })

      const updated = await repo.update(created.id, { code: 'NEW' })

      expect(updated.code).toBe('NEW')
      expect(updated.name).toBe('Old Code')
    })

    it('should update item name', async () => {
      const created = await repo.create('rank', {
        code: 'TEST',
        name: 'Old Name',
      })

      const updated = await repo.update(created.id, { name: 'New Name' })

      expect(updated.name).toBe('New Name')
      expect(updated.code).toBe('TEST')
    })

    it('should update multiple fields', async () => {
      const created = await repo.create('rank', {
        code: 'OLD',
        name: 'Old Item',
        description: 'Old description',
      })

      const update: UpdateListItemInput = {
        code: 'NEW',
        name: 'New Item',
        description: 'New description',
        displayOrder: 5,
      }
      const updated = await repo.update(created.id, update)

      expect(updated.code).toBe('NEW')
      expect(updated.name).toBe('New Item')
      expect(updated.description).toBe('New description')
      expect(updated.displayOrder).toBe(5)
    })

    it('should clear description when set to null', async () => {
      const created = await repo.create('rank', {
        code: 'TEST',
        name: 'Test Item',
        description: 'Has description',
      })

      const updated = await repo.update(created.id, { description: null as any })

      expect(updated.description).toBeUndefined()
    })

    it('should throw error when updating non-existent item', async () => {
      await expect(
        repo.update('550e8400-e29b-41d4-a716-446655440000', { name: 'New Name' })
      ).rejects.toThrow('List item not found')
    })

    it('should throw error when updating with empty data', async () => {
      const created = await repo.create('rank', {
        code: 'TEST',
        name: 'Test Item',
      })

      await expect(repo.update(created.id, {})).rejects.toThrow('No fields to update')
    })
  })

  describe('delete', () => {
    it('should delete existing list item', async () => {
      const created = await repo.create('rank', {
        code: 'DELETE_ME',
        name: 'To Delete',
      })

      await repo.delete(created.id)

      const found = await repo.findById(created.id)
      expect(found).toBeNull()
    })

    it('should throw error when deleting non-existent item', async () => {
      await expect(repo.delete('550e8400-e29b-41d4-a716-446655440000')).rejects.toThrow(
        'List item not found'
      )
    })
  })

  describe('getUsageCount', () => {
    it('should return 0 for item with no usage', async () => {
      const item = await repo.create('rank', {
        code: 'UNUSED',
        name: 'Unused Rank',
      })

      const count = await repo.getUsageCount(item.id)
      expect(count).toBe(0)
    })

    it('should return correct count for rank items', async () => {
      const item = await repo.create('rank', {
        code: 'AB',
        name: 'Able Seaman',
      })

      const division = await testDb.prisma!.division.create({
        data: {
          code: 'TEST',
          name: 'Test Division',
        },
      })

      await testDb.prisma!.member.createMany({
        data: [
          {
            serviceNumber: 'SN001',
            rank: 'Able Seaman',
            firstName: 'John',
            lastName: 'Doe',
            divisionId: division.id,
            status: 'ACTIVE',
            memberType: 'REGULAR',
          },
          {
            serviceNumber: 'SN002',
            rank: 'Able Seaman',
            firstName: 'Jane',
            lastName: 'Smith',
            divisionId: division.id,
            status: 'ACTIVE',
            memberType: 'REGULAR',
          },
        ],
      })

      const count = await repo.getUsageCount(item.id)
      expect(count).toBe(2)
    })

    it('should return correct count for mess items', async () => {
      const item = await repo.create('mess', {
        code: 'JR',
        name: 'Junior Ranks',
      })

      const division = await testDb.prisma!.division.create({
        data: {
          code: 'TEST',
          name: 'Test Division',
        },
      })

      await testDb.prisma!.member.create({
        data: {
          serviceNumber: 'SN001',
          rank: 'AB',
          firstName: 'John',
          lastName: 'Doe',
          divisionId: division.id,
          status: 'ACTIVE',
          memberType: 'REGULAR',
          mess: 'Junior Ranks',
        },
      })

      const count = await repo.getUsageCount(item.id)
      expect(count).toBe(1)
    })

    it('should return correct count for event_role items', async () => {
      const item = await repo.create('event_role', {
        code: 'STAFF',
        name: 'Staff Member',
      })

      const adminUser = await testDb.prisma!.adminUser.create({
        data: {
          username: 'admin',
          passwordHash: 'test',
          email: 'admin@test.com',
          displayName: 'Admin User',
          role: 'ADMIN',
        },
      })

      const event = await testDb.prisma!.event.create({
        data: {
          name: 'Test Event',
          code: 'TEST',
          startDate: new Date(),
          endDate: new Date(),
          status: 'ACTIVE',
          autoExpireBadges: true,
          createdBy: adminUser.id,
        },
      })

      await testDb.prisma!.eventAttendee.create({
        data: {
          eventId: event.id,
          name: 'John Doe',
          organization: 'Test Org',
          role: 'Staff Member',
          status: 'active',
        },
      })

      const count = await repo.getUsageCount(item.id)
      expect(count).toBe(1)
    })

    it('should return 0 for non-existent item', async () => {
      const count = await repo.getUsageCount('550e8400-e29b-41d4-a716-446655440000')
      expect(count).toBe(0)
    })

    it('should return 0 for unknown list type', async () => {
      // Manually insert item with unknown type for testing
      const unknownItem = await testDb.prisma!.$queryRaw<Array<{ id: string }>>`
        INSERT INTO list_items (list_type, code, name, display_order, is_system)
        VALUES ('unknown_type', 'TEST', 'Test Item', 1, false)
        RETURNING id
      `

      const count = await repo.getUsageCount(unknownItem[0].id)
      expect(count).toBe(0)
    })
  })

  describe('reorder', () => {
    it('should reorder items based on array position', async () => {
      const item1 = await repo.create('rank', {
        code: 'AB',
        name: 'Able Seaman',
        displayOrder: 1,
      })
      const item2 = await repo.create('rank', { code: 'LS', name: 'Leading Seaman', displayOrder: 2 })
      const item3 = await repo.create('rank', {
        code: 'MS',
        name: 'Master Seaman',
        displayOrder: 3,
      })

      // Reorder: item3, item1, item2
      await repo.reorder('rank', [item3.id, item1.id, item2.id])

      // Fetch all and verify order
      const items = await repo.findByType('rank')

      expect(items[0].id).toBe(item3.id)
      expect(items[0].displayOrder).toBe(1)
      expect(items[1].id).toBe(item1.id)
      expect(items[1].displayOrder).toBe(2)
      expect(items[2].id).toBe(item2.id)
      expect(items[2].displayOrder).toBe(3)
    })

    it('should handle empty array', async () => {
      await repo.create('rank', { code: 'AB', name: 'Able Seaman' })

      // Should not throw
      await expect(repo.reorder('rank', [])).resolves.not.toThrow()
    })

    it('should only reorder items of specified type', async () => {
      const rankItem = await repo.create('rank', { code: 'AB', name: 'Able Seaman' })
      const messItem = await repo.create('mess', { code: 'JR', name: 'Junior Ranks' })

      await repo.reorder('rank', [rankItem.id])

      const messItemAfter = await repo.findById(messItem.id)
      expect(messItemAfter?.displayOrder).toBe(1) // Unchanged
    })

    it('should update updatedAt timestamp', async () => {
      const item = await repo.create('rank', { code: 'AB', name: 'Able Seaman' })
      const originalUpdatedAt = item.updatedAt

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10))

      await repo.reorder('rank', [item.id])

      const updated = await repo.findById(item.id)
      expect(updated?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime())
    })
  })

  describe('edge cases', () => {
    it('should handle very long item names', async () => {
      const longName = 'A'.repeat(100)
      const item = await repo.create('rank', {
        code: 'LONG',
        name: longName,
      })

      expect(item.name).toBe(longName)
    })

    it('should handle special characters in names', async () => {
      const item = await repo.create('rank', {
        code: 'SPECIAL',
        name: 'Item & Special <Characters> "Quotes"',
      })

      expect(item.name).toBe('Item & Special <Characters> "Quotes"')
    })

    it('should handle large display order values', async () => {
      const item = await repo.create('rank', {
        code: 'LARGE',
        name: 'Large Order',
        displayOrder: 999999,
      })

      expect(item.displayOrder).toBe(999999)
    })
  })
})
