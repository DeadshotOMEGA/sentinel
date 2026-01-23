import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { TestDatabase } from '../../helpers/testcontainers'
import { VisitTypeRepository } from '../../../src/repositories/visit-type-repository'
import type { CreateVisitTypeInput, UpdateVisitTypeInput } from '@sentinel/types'

describe('VisitTypeRepository Integration Tests', () => {
  const testDb = new TestDatabase()
  let repo: VisitTypeRepository

  beforeAll(async () => {
    await testDb.start()
    repo = new VisitTypeRepository(testDb.prisma!)
  }, 60000)

  afterAll(async () => {
    await testDb.stop()
  })

  beforeEach(async () => {
    await testDb.reset()
  })

  describe('create', () => {
    it('should create a visit type with all fields', async () => {
      const input: CreateVisitTypeInput = {
        code: 'OFFICIAL',
        name: 'Official Visit',
        description: 'Official business visit',
        color: '#FF0000',
      }

      const type = await repo.create(input)

      expect(type.id).toBeDefined()
      expect(type.code).toBe('OFFICIAL')
      expect(type.name).toBe('Official Visit')
      expect(type.description).toBe('Official business visit')
      expect(type.color).toBe('#FF0000')
      expect(type.createdAt).toBeInstanceOf(Date)
      expect(type.updatedAt).toBeInstanceOf(Date)
    })

    it('should create visit type without optional fields', async () => {
      const input: CreateVisitTypeInput = {
        code: 'CASUAL',
        name: 'Casual Visit',
      }

      const type = await repo.create(input)

      expect(type.code).toBe('CASUAL')
      expect(type.name).toBe('Casual Visit')
      expect(type.description).toBeUndefined()
      expect(type.color).toBeUndefined()
    })

    it('should throw error on duplicate code', async () => {
      await repo.create({ code: 'DUPLICATE', name: 'Duplicate Type' })

      await expect(repo.create({ code: 'DUPLICATE', name: 'Another Type' })).rejects.toThrow()
    })
  })

  describe('findAll', () => {
    it('should return empty array when no types exist', async () => {
      const types = await repo.findAll()
      expect(types).toEqual([])
    })

    it('should return all types ordered by name', async () => {
      await repo.create({ code: 'C', name: 'Charlie' })
      await repo.create({ code: 'A', name: 'Alpha' })
      await repo.create({ code: 'B', name: 'Bravo' })

      const types = await repo.findAll()

      expect(types).toHaveLength(3)
      expect(types[0]!.name).toBe('Alpha')
      expect(types[1]!.name).toBe('Bravo')
      expect(types[2]!.name).toBe('Charlie')
    })
  })

  describe('findById', () => {
    it('should find existing visit type by ID', async () => {
      const created = await repo.create({
        code: 'TEST',
        name: 'Test Type',
      })

      const found = await repo.findById(created.id)

      expect(found).toBeDefined()
      expect(found?.id).toBe(created.id)
      expect(found?.code).toBe('TEST')
    })

    it('should return null when type does not exist', async () => {
      const found = await repo.findById('550e8400-e29b-41d4-a716-446655440000')
      expect(found).toBeNull()
    })

    it('should handle invalid UUID format', async () => {
      await expect(repo.findById('invalid-uuid')).rejects.toThrow()
    })
  })

  describe('findByCode', () => {
    it('should find existing visit type by code', async () => {
      await repo.create({
        code: 'UNIQUE',
        name: 'Unique Type',
      })

      const found = await repo.findByCode('UNIQUE')

      expect(found).toBeDefined()
      expect(found?.code).toBe('UNIQUE')
    })

    it('should return null when code does not exist', async () => {
      const found = await repo.findByCode('NONEXISTENT')
      expect(found).toBeNull()
    })

    it('should be case-sensitive', async () => {
      await repo.create({
        code: 'CaseSensitive',
        name: 'Test',
      })

      const found = await repo.findByCode('casesensitive')
      expect(found).toBeNull()
    })
  })

  describe('update', () => {
    it('should update type code', async () => {
      const created = await repo.create({
        code: 'OLD',
        name: 'Old Type',
      })

      const updated = await repo.update(created.id, { code: 'NEW' })

      expect(updated.code).toBe('NEW')
      expect(updated.name).toBe('Old Type')
    })

    it('should update type name', async () => {
      const created = await repo.create({
        code: 'TEST',
        name: 'Old Name',
      })

      const updated = await repo.update(created.id, { name: 'New Name' })

      expect(updated.name).toBe('New Name')
      expect(updated.code).toBe('TEST')
    })

    it('should update multiple fields', async () => {
      const created = await repo.create({
        code: 'OLD',
        name: 'Old Type',
        description: 'Old description',
      })

      const update: UpdateVisitTypeInput = {
        code: 'NEW',
        name: 'New Type',
        description: 'New description',
        color: '#FF0000',
      }
      const updated = await repo.update(created.id, update)

      expect(updated.code).toBe('NEW')
      expect(updated.name).toBe('New Type')
      expect(updated.description).toBe('New description')
      expect(updated.color).toBe('#FF0000')
    })

    it('should clear description when set to null', async () => {
      const created = await repo.create({
        code: 'TEST',
        name: 'Test Type',
        description: 'Has description',
      })

      const updated = await repo.update(created.id, { description: null as any })

      expect(updated.description).toBeUndefined()
    })

    it('should throw error when updating non-existent type', async () => {
      await expect(
        repo.update('550e8400-e29b-41d4-a716-446655440000', { name: 'New Name' })
      ).rejects.toThrow('Visit type not found')
    })

    it('should throw error when updating with empty data', async () => {
      const created = await repo.create({
        code: 'TEST',
        name: 'Test Type',
      })

      await expect(repo.update(created.id, {})).rejects.toThrow('No fields to update')
    })

    it('should throw error on duplicate code', async () => {
      const type1 = await repo.create({ code: 'TYPE1', name: 'Type 1' })
      await repo.create({ code: 'TYPE2', name: 'Type 2' })

      await expect(repo.update(type1.id, { code: 'TYPE2' })).rejects.toThrow()
    })
  })

  describe('delete', () => {
    it('should delete existing visit type', async () => {
      const created = await repo.create({
        code: 'DELETE_ME',
        name: 'To Delete',
      })

      await repo.delete(created.id)

      const found = await repo.findById(created.id)
      expect(found).toBeNull()
    })

    it('should throw error when deleting non-existent type', async () => {
      await expect(repo.delete('550e8400-e29b-41d4-a716-446655440000')).rejects.toThrow(
        'Visit type not found'
      )
    })

    it('should prevent deletion when type is in use', async () => {
      const type = await repo.create({
        code: 'IN_USE',
        name: 'In Use Type',
      })

      // Create a visitor using this type
      const division = await testDb.prisma!.division.create({
        data: {
          code: 'TEST',
          name: 'Test Division',
        },
      })

      const hostMember = await testDb.prisma!.member.create({
        data: {
          serviceNumber: 'HOST001',
          rank: 'AB',
          firstName: 'Host',
          lastName: 'Member',
          divisionId: division.id,
          status: 'ACTIVE',
          memberType: 'REGULAR',
        },
      })

      await testDb.prisma!.visitor.create({
        data: {
          name: 'John Visitor',
          organization: 'External',
          visitType: 'guest',
          visitTypeId: type.id,
          hostMemberId: hostMember.id,
          kioskId: 'KIOSK_TEST',
          checkInTime: new Date(),
        },
      })

      await expect(repo.delete(type.id)).rejects.toThrow(
        'Cannot delete visit type with 1 assigned visitors'
      )
    })
  })

  describe('getUsageCount', () => {
    it('should return 0 for type with no visitors', async () => {
      const type = await repo.create({
        code: 'UNUSED',
        name: 'Unused Type',
      })

      const count = await repo.getUsageCount(type.id)
      expect(count).toBe(0)
    })

    it('should return correct count for type with visitors', async () => {
      const type = await repo.create({
        code: 'POPULAR',
        name: 'Popular Type',
      })

      const division = await testDb.prisma!.division.create({
        data: {
          code: 'TEST',
          name: 'Test Division',
        },
      })

      const hostMember = await testDb.prisma!.member.create({
        data: {
          serviceNumber: 'HOST001',
          rank: 'AB',
          firstName: 'Host',
          lastName: 'Member',
          divisionId: division.id,
          status: 'ACTIVE',
          memberType: 'REGULAR',
        },
      })

      await testDb.prisma!.visitor.createMany({
        data: [
          {
            name: 'John Visitor',
            organization: 'External',
            visitType: 'guest',
            visitTypeId: type.id,
            hostMemberId: hostMember.id,
            kioskId: 'KIOSK_TEST',
            checkInTime: new Date(),
          },
          {
            name: 'Jane Guest',
            organization: 'External',
            visitType: 'guest',
            visitTypeId: type.id,
            hostMemberId: hostMember.id,
            kioskId: 'KIOSK_TEST',
            checkInTime: new Date(),
            expectedDuration: 120,
          },
        ],
      })

      const count = await repo.getUsageCount(type.id)
      expect(count).toBe(2)
    })

    it('should return 0 for non-existent type', async () => {
      const count = await repo.getUsageCount('550e8400-e29b-41d4-a716-446655440000')
      expect(count).toBe(0)
    })
  })

  describe('edge cases', () => {
    it('should handle very long type names', async () => {
      const longName = 'A'.repeat(100)
      const type = await repo.create({
        code: 'LONG',
        name: longName,
      })

      expect(type.name).toBe(longName)
    })

    it('should handle special characters in names', async () => {
      const type = await repo.create({
        code: 'SPECIAL',
        name: 'Type & Special <Characters> "Quotes"',
      })

      expect(type.name).toBe('Type & Special <Characters> "Quotes"')
    })

    it('should handle hex color formats', async () => {
      const type = await repo.create({
        code: 'COLOR',
        name: 'Colored Type',
        color: '#FF0000',
      })

      expect(type.color).toBe('#FF0000')
    })
  })
})
