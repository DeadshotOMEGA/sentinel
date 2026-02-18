import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { TestDatabase } from '../../helpers/testcontainers'
import { TagRepository } from '../../../src/repositories/tag-repository'
import type { CreateTagInput, UpdateTagInput } from '@sentinel/types'

describe('TagRepository Integration Tests', () => {
  const testDb = new TestDatabase()
  let repo: TagRepository

  beforeAll(async () => {
    await testDb.start()
    repo = new TagRepository(testDb.prisma!)
  }, 60000)

  afterAll(async () => {
    await testDb.stop()
  })

  beforeEach(async () => {
    await testDb.reset()
  })

  describe('create', () => {
    it('should create a tag with all fields', async () => {
      const input: CreateTagInput = {
        name: 'Important',
        color: '#FF0000',
        description: 'Important member tag',
      }

      const tag = await repo.create(input)

      expect(tag.id).toBeDefined()
      expect(tag.name).toBe('Important')
      expect(tag.color).toBe('#FF0000')
      expect(tag.description).toBe('Important member tag')
      expect(tag.displayOrder).toBe(1) // First tag should have order 1
    })

    it('should create tag without description', async () => {
      const input: CreateTagInput = {
        name: 'Basic Tag',
        color: '#00FF00',
      }

      const tag = await repo.create(input)

      expect(tag.name).toBe('Basic Tag')
      expect(tag.description).toBeUndefined()
    })

    it('should auto-increment display order', async () => {
      await repo.create({ name: 'Tag 1', color: '#111111' })
      await repo.create({ name: 'Tag 2', color: '#222222' })
      const tag3 = await repo.create({ name: 'Tag 3', color: '#333333' })

      expect(tag3.displayOrder).toBe(3)
    })

    it('should respect custom display order', async () => {
      await repo.create({ name: 'Tag 1', color: '#111111' })
      const tag = await repo.create({ name: 'Tag 2', color: '#222222', displayOrder: 10 })

      expect(tag.displayOrder).toBe(10)
    })

    it('should throw error on duplicate name', async () => {
      await repo.create({ name: 'Duplicate', color: '#000000' })

      await expect(repo.create({ name: 'Duplicate', color: '#111111' })).rejects.toThrow()
    })
  })

  describe('findAll', () => {
    it('should return empty array when no tags exist', async () => {
      const tags = await repo.findAll()
      expect(tags).toEqual([])
    })

    it('should return all tags ordered by displayOrder then name', async () => {
      await repo.create({ name: 'C-Tag', color: '#CC0000', displayOrder: 2 })
      await repo.create({ name: 'A-Tag', color: '#AA0000', displayOrder: 1 })
      await repo.create({ name: 'B-Tag', color: '#BB0000', displayOrder: 1 })

      const tags = await repo.findAll()

      expect(tags).toHaveLength(3)
      expect(tags[0]!.name).toBe('A-Tag') // Same displayOrder, sorted by name
      expect(tags[1]!.name).toBe('B-Tag')
      expect(tags[2]!.name).toBe('C-Tag')
    })
  })

  describe('findById', () => {
    it('should find existing tag by ID', async () => {
      const created = await repo.create({
        name: 'Find Me',
        color: '#AABBCC',
      })

      const found = await repo.findById(created.id)

      expect(found).toBeDefined()
      expect(found?.id).toBe(created.id)
      expect(found?.name).toBe('Find Me')
    })

    it('should return null when tag does not exist', async () => {
      const found = await repo.findById('550e8400-e29b-41d4-a716-446655440000')
      expect(found).toBeNull()
    })

    it('should handle invalid UUID format', async () => {
      await expect(repo.findById('invalid-uuid')).rejects.toThrow()
    })
  })

  describe('findByName', () => {
    it('should find existing tag by name', async () => {
      await repo.create({
        name: 'Unique Name',
        color: '#123456',
      })

      const found = await repo.findByName('Unique Name')

      expect(found).toBeDefined()
      expect(found?.name).toBe('Unique Name')
    })

    it('should return null when tag name does not exist', async () => {
      const found = await repo.findByName('Nonexistent Tag')
      expect(found).toBeNull()
    })

    it('should be case-sensitive', async () => {
      await repo.create({
        name: 'CaseSensitive',
        color: '#000000',
      })

      const found = await repo.findByName('casesensitive')
      expect(found).toBeNull()
    })
  })

  describe('update', () => {
    it('should update tag name', async () => {
      const created = await repo.create({
        name: 'Old Name',
        color: '#000000',
      })

      const updated = await repo.update(created.id, { name: 'New Name' })

      expect(updated.name).toBe('New Name')
      expect(updated.color).toBe('#000000')
    })

    it('should update tag color', async () => {
      const created = await repo.create({
        name: 'Test Tag',
        color: '#000000',
      })

      const updated = await repo.update(created.id, { color: '#FF0000' })

      expect(updated.color).toBe('#FF0000')
      expect(updated.name).toBe('Test Tag')
    })

    it('should update multiple fields', async () => {
      const created = await repo.create({
        name: 'Old Tag',
        color: '#000000',
        description: 'Old description',
      })

      const update: UpdateTagInput = {
        name: 'New Tag',
        color: '#FFFFFF',
        description: 'New description',
        displayOrder: 5,
      }
      const updated = await repo.update(created.id, update)

      expect(updated.name).toBe('New Tag')
      expect(updated.color).toBe('#FFFFFF')
      expect(updated.description).toBe('New description')
      expect(updated.displayOrder).toBe(5)
    })

    it('should clear description when set to null', async () => {
      const created = await repo.create({
        name: 'Test Tag',
        color: '#000000',
        description: 'Has description',
      })

      const updated = await repo.update(created.id, { description: null as any })

      expect(updated.description).toBeUndefined()
    })

    it('should throw error when updating non-existent tag', async () => {
      await expect(
        repo.update('550e8400-e29b-41d4-a716-446655440000', { name: 'New Name' })
      ).rejects.toThrow('Tag not found')
    })

    it('should throw error when updating with empty data', async () => {
      const created = await repo.create({
        name: 'Test Tag',
        color: '#000000',
      })

      await expect(repo.update(created.id, {})).rejects.toThrow('No fields to update')
    })

    it('should throw error on duplicate name', async () => {
      const tag1 = await repo.create({ name: 'Tag 1', color: '#111111' })
      await repo.create({ name: 'Tag 2', color: '#222222' })

      await expect(repo.update(tag1.id, { name: 'Tag 2' })).rejects.toThrow()
    })
  })

  describe('delete', () => {
    it('should delete existing tag', async () => {
      const created = await repo.create({
        name: 'To Delete',
        color: '#000000',
      })

      await repo.delete(created.id)

      const found = await repo.findById(created.id)
      expect(found).toBeNull()
    })

    it('should throw error when deleting non-existent tag', async () => {
      await expect(repo.delete('550e8400-e29b-41d4-a716-446655440000')).rejects.toThrow(
        'Tag not found'
      )
    })
  })

  describe('getUsageCount', () => {
    it('should return 0 for tag with no members', async () => {
      const tag = await repo.create({
        name: 'Unused Tag',
        color: '#000000',
      })

      const count = await repo.getUsageCount(tag.id)
      expect(count).toBe(0)
    })

    it('should return correct count for tag with members', async () => {
      const tag = await repo.create({
        name: 'Popular Tag',
        color: '#000000',
      })

      // Create members and assign tag
      const division = await testDb.prisma!.division.create({
        data: {
          code: 'TEST',
          name: 'Test Division',
        },
      })

      const member1 = await testDb.prisma!.member.create({
        data: {
          serviceNumber: 'SN001',
          rank: 'S2',
          firstName: 'John',
          lastName: 'Doe',
          divisionId: division.id,
          status: 'ACTIVE',
          memberType: 'REGULAR',
        },
      })

      const member2 = await testDb.prisma!.member.create({
        data: {
          serviceNumber: 'SN002',
          rank: 'S1',
          firstName: 'Jane',
          lastName: 'Smith',
          divisionId: division.id,
          status: 'ACTIVE',
          memberType: 'REGULAR',
        },
      })

      await testDb.prisma!.memberTag.createMany({
        data: [
          { memberId: member1.id, tagId: tag.id },
          { memberId: member2.id, tagId: tag.id },
        ],
      })

      const count = await repo.getUsageCount(tag.id)
      expect(count).toBe(2)
    })

    it('should return 0 for non-existent tag', async () => {
      const count = await repo.getUsageCount('550e8400-e29b-41d4-a716-446655440000')
      expect(count).toBe(0)
    })
  })

  describe('reorder', () => {
    it('should reorder tags based on array position', async () => {
      const tag1 = await repo.create({ name: 'Tag 1', color: '#111111', displayOrder: 1 })
      const tag2 = await repo.create({ name: 'Tag 2', color: '#222222', displayOrder: 2 })
      const tag3 = await repo.create({ name: 'Tag 3', color: '#333333', displayOrder: 3 })

      // Reorder: tag3, tag1, tag2
      await repo.reorder([tag3.id, tag1.id, tag2.id])

      // Fetch all and verify order
      const tags = await repo.findAll()

      expect(tags[0]!.id).toBe(tag3.id)
      expect(tags[0]!.displayOrder).toBe(1)
      expect(tags[1]!.id).toBe(tag1.id)
      expect(tags[1]!.displayOrder).toBe(2)
      expect(tags[2]!.id).toBe(tag2.id)
      expect(tags[2]!.displayOrder).toBe(3)
    })

    it('should handle empty array', async () => {
      await repo.create({ name: 'Tag 1', color: '#111111' })

      // Should not throw
      await expect(repo.reorder([])).resolves.not.toThrow()
    })

    it('should update updatedAt timestamp', async () => {
      const tag = await repo.create({ name: 'Test Tag', color: '#000000' })
      const originalUpdatedAt = tag.updatedAt

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10))

      await repo.reorder([tag.id])

      const updated = await repo.findById(tag.id)
      expect(updated?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime())
    })
  })

  describe('edge cases', () => {
    it('should handle very long tag names', async () => {
      const longName = 'A'.repeat(100)
      const tag = await repo.create({
        name: longName,
        color: '#000000',
      })

      expect(tag.name).toBe(longName)
    })

    it('should handle special characters in tag names', async () => {
      const tag = await repo.create({
        name: 'Tag & Special <Characters> "Quotes"',
        color: '#000000',
      })

      expect(tag.name).toBe('Tag & Special <Characters> "Quotes"')
    })

    it('should handle hex color formats', async () => {
      const tag = await repo.create({
        name: 'Color Test',
        color: '#FF0000',
      })

      expect(tag.color).toBe('#FF0000')
    })

    it('should handle large display order values', async () => {
      const tag = await repo.create({
        name: 'Large Order',
        color: '#000000',
        displayOrder: 999999,
      })

      expect(tag.displayOrder).toBe(999999)
    })
  })
})
