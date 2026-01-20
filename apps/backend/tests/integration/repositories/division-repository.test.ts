import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { TestDatabase } from '../../helpers/testcontainers'
import { DivisionRepository } from '../../../src/repositories/division-repository'
import type { CreateDivisionInput, UpdateDivisionInput } from '@sentinel/types'

describe('DivisionRepository Integration Tests', () => {
  const testDb = new TestDatabase()
  let repo: DivisionRepository

  beforeAll(async () => {
    await testDb.start()
    repo = new DivisionRepository(testDb.prisma!)
  }, 60000)

  afterAll(async () => {
    await testDb.stop()
  })

  beforeEach(async () => {
    await testDb.reset()
    // Don't seed - we want explicit control over divisions in these tests
  })

  describe('create', () => {
    it('should create a division with all required fields', async () => {
      const input: CreateDivisionInput = {
        name: 'Operations Division',
        code: 'OPS',
        description: 'Handles all operational tasks',
      }

      const division = await repo.create(input)

      expect(division.id).toBeDefined()
      expect(division.name).toBe(input.name)
      expect(division.code).toBe(input.code)
      expect(division.description).toBe(input.description)
      expect(division.createdAt).toBeDefined()
      expect(division.updatedAt).toBeDefined()
    })

    it('should create a division without description', async () => {
      const input: CreateDivisionInput = {
        name: 'Logistics Division',
        code: 'LOG',
      }

      const division = await repo.create(input)

      expect(division.id).toBeDefined()
      expect(division.name).toBe(input.name)
      expect(division.code).toBe(input.code)
      expect(division.description).toBeUndefined()
    })

    it('should throw error on duplicate code', async () => {
      const input: CreateDivisionInput = {
        name: 'Operations Division',
        code: 'OPS',
      }

      await repo.create(input)

      await expect(
        repo.create({ ...input, name: 'Different Name' })
      ).rejects.toThrow()
    })
  })

  describe('findAll', () => {
    it('should return empty array when no divisions exist', async () => {
      const divisions = await repo.findAll()
      expect(divisions).toEqual([])
    })

    it('should return all divisions sorted by code', async () => {
      await repo.create({ name: 'Logistics', code: 'LOG' })
      await repo.create({ name: 'Operations', code: 'OPS' })
      await repo.create({ name: 'Administration', code: 'ADMIN' })

      const divisions = await repo.findAll()

      expect(divisions).toHaveLength(3)
      expect(divisions[0].code).toBe('ADMIN')
      expect(divisions[1].code).toBe('LOG')
      expect(divisions[2].code).toBe('OPS')
    })

    it('should return divisions with correct field types', async () => {
      await repo.create({
        name: 'Test Division',
        code: 'TEST',
        description: 'Test description',
      })

      const divisions = await repo.findAll()

      expect(divisions).toHaveLength(1)
      const division = divisions[0]
      expect(typeof division.id).toBe('string')
      expect(typeof division.name).toBe('string')
      expect(typeof division.code).toBe('string')
      expect(typeof division.description).toBe('string')
      expect(division.createdAt).toBeInstanceOf(Date)
      expect(division.updatedAt).toBeInstanceOf(Date)
    })
  })

  describe('findById', () => {
    it('should find an existing division by ID', async () => {
      const created = await repo.create({
        name: 'Operations Division',
        code: 'OPS',
      })

      const found = await repo.findById(created.id)

      expect(found).toBeDefined()
      expect(found?.id).toBe(created.id)
      expect(found?.name).toBe(created.name)
      expect(found?.code).toBe(created.code)
    })

    it('should return null when division does not exist', async () => {
      const found = await repo.findById('550e8400-e29b-41d4-a716-446655440000')
      expect(found).toBeNull()
    })

    it('should handle invalid UUID format', async () => {
      await expect(repo.findById('invalid-id')).rejects.toThrow()
    })
  })

  describe('findByCode', () => {
    it('should find an existing division by code', async () => {
      await repo.create({
        name: 'Operations Division',
        code: 'OPS',
      })

      const found = await repo.findByCode('OPS')

      expect(found).toBeDefined()
      expect(found?.code).toBe('OPS')
      expect(found?.name).toBe('Operations Division')
    })

    it('should return null when division code does not exist', async () => {
      const found = await repo.findByCode('NONEXISTENT')
      expect(found).toBeNull()
    })

    it('should be case-sensitive', async () => {
      await repo.create({
        name: 'Operations Division',
        code: 'OPS',
      })

      const found = await repo.findByCode('ops')
      expect(found).toBeNull()
    })
  })

  describe('update', () => {
    it('should update division name', async () => {
      const created = await repo.create({
        name: 'Old Name',
        code: 'TEST',
      })

      const update: UpdateDivisionInput = { name: 'New Name' }
      const updated = await repo.update(created.id, update)

      expect(updated.name).toBe('New Name')
      expect(updated.code).toBe('TEST')
      expect(updated.id).toBe(created.id)
    })

    it('should update division code', async () => {
      const created = await repo.create({
        name: 'Test Division',
        code: 'OLD',
      })

      const update: UpdateDivisionInput = { code: 'NEW' }
      const updated = await repo.update(created.id, update)

      expect(updated.code).toBe('NEW')
      expect(updated.name).toBe('Test Division')
    })

    it('should update division description', async () => {
      const created = await repo.create({
        name: 'Test Division',
        code: 'TEST',
      })

      const update: UpdateDivisionInput = { description: 'New description' }
      const updated = await repo.update(created.id, update)

      expect(updated.description).toBe('New description')
    })

    it('should update multiple fields at once', async () => {
      const created = await repo.create({
        name: 'Old Name',
        code: 'OLD',
      })

      const update: UpdateDivisionInput = {
        name: 'New Name',
        code: 'NEW',
        description: 'New description',
      }
      const updated = await repo.update(created.id, update)

      expect(updated.name).toBe('New Name')
      expect(updated.code).toBe('NEW')
      expect(updated.description).toBe('New description')
    })

    it('should throw error when updating non-existent division', async () => {
      await expect(
        repo.update('550e8400-e29b-41d4-a716-446655440000', { name: 'New Name' })
      ).rejects.toThrow('Division not found')
    })

    it('should throw error when updating with empty data', async () => {
      const created = await repo.create({
        name: 'Test Division',
        code: 'TEST',
      })

      await expect(repo.update(created.id, {})).rejects.toThrow('No fields to update')
    })

    it('should throw error on duplicate code', async () => {
      const div1 = await repo.create({ name: 'Division 1', code: 'DIV1' })
      await repo.create({ name: 'Division 2', code: 'DIV2' })

      await expect(repo.update(div1.id, { code: 'DIV2' })).rejects.toThrow()
    })
  })

  describe('delete', () => {
    it('should delete a division with no members', async () => {
      const created = await repo.create({
        name: 'Test Division',
        code: 'TEST',
      })

      await repo.delete(created.id)

      const found = await repo.findById(created.id)
      expect(found).toBeNull()
    })

    it('should throw error when deleting non-existent division', async () => {
      await expect(
        repo.delete('550e8400-e29b-41d4-a716-446655440000')
      ).rejects.toThrow('Division not found')
    })

    it('should throw error when deleting division with assigned members', async () => {
      const division = await repo.create({
        name: 'Test Division',
        code: 'TEST',
      })

      // Create a member assigned to this division
      await testDb.prisma!.member.create({
        data: {
          serviceNumber: 'SN12345',
          rank: 'AB',
          firstName: 'John',
          lastName: 'Doe',
          divisionId: division.id,
          status: 'ACTIVE',
          memberType: 'REGULAR',
        },
      })

      await expect(repo.delete(division.id)).rejects.toThrow(
        'Cannot delete division with 1 assigned members'
      )

      // Verify division still exists
      const found = await repo.findById(division.id)
      expect(found).toBeDefined()
    })

    it('should throw error when deleting division with multiple assigned members', async () => {
      const division = await repo.create({
        name: 'Test Division',
        code: 'TEST',
      })

      // Create multiple members
      await testDb.prisma!.member.createMany({
        data: [
          {
            serviceNumber: 'SN001',
            rank: 'AB',
            firstName: 'John',
            lastName: 'Doe',
            divisionId: division.id,
            status: 'ACTIVE',
            memberType: 'REGULAR',
          },
          {
            serviceNumber: 'SN002',
            rank: 'LS',
            firstName: 'Jane',
            lastName: 'Smith',
            divisionId: division.id,
            status: 'ACTIVE',
            memberType: 'REGULAR',
          },
          {
            serviceNumber: 'SN003',
            rank: 'MS',
            firstName: 'Bob',
            lastName: 'Johnson',
            divisionId: division.id,
            status: 'ACTIVE',
            memberType: 'REGULAR',
          },
        ],
      })

      await expect(repo.delete(division.id)).rejects.toThrow(
        'Cannot delete division with 3 assigned members'
      )
    })
  })

  describe('getUsageCount', () => {
    it('should return 0 for division with no members', async () => {
      const division = await repo.create({
        name: 'Test Division',
        code: 'TEST',
      })

      const count = await repo.getUsageCount(division.id)
      expect(count).toBe(0)
    })

    it('should return correct count for division with members', async () => {
      const division = await repo.create({
        name: 'Test Division',
        code: 'TEST',
      })

      await testDb.prisma!.member.createMany({
        data: [
          {
            serviceNumber: 'SN001',
            rank: 'AB',
            firstName: 'John',
            lastName: 'Doe',
            divisionId: division.id,
            status: 'ACTIVE',
            memberType: 'REGULAR',
          },
          {
            serviceNumber: 'SN002',
            rank: 'LS',
            firstName: 'Jane',
            lastName: 'Smith',
            divisionId: division.id,
            status: 'ACTIVE',
            memberType: 'REGULAR',
          },
        ],
      })

      const count = await repo.getUsageCount(division.id)
      expect(count).toBe(2)
    })

    it('should return 0 for non-existent division', async () => {
      const count = await repo.getUsageCount('550e8400-e29b-41d4-a716-446655440000')
      expect(count).toBe(0)
    })

    it('should count members across different statuses', async () => {
      const division = await repo.create({
        name: 'Test Division',
        code: 'TEST',
      })

      await testDb.prisma!.member.createMany({
        data: [
          {
            serviceNumber: 'SN001',
            rank: 'AB',
            firstName: 'Active',
            lastName: 'Member',
            divisionId: division.id,
            status: 'ACTIVE',
            memberType: 'REGULAR',
          },
          {
            serviceNumber: 'SN002',
            rank: 'LS',
            firstName: 'Inactive',
            lastName: 'Member',
            divisionId: division.id,
            status: 'INACTIVE',
            memberType: 'REGULAR',
          },
        ],
      })

      const count = await repo.getUsageCount(division.id)
      expect(count).toBe(2)
    })
  })

  describe('edge cases', () => {
    it('should handle very long division names', async () => {
      const longName = 'A'.repeat(100)
      const division = await repo.create({
        name: longName,
        code: 'LONG',
      })

      expect(division.name).toBe(longName)
    })

    it('should handle special characters in division names', async () => {
      const division = await repo.create({
        name: 'Test & Development - Phase 1 (v2.0)',
        code: 'T&D',
      })

      expect(division.name).toBe('Test & Development - Phase 1 (v2.0)')
    })

    it('should handle very long descriptions', async () => {
      const longDescription = 'A'.repeat(1000)
      const division = await repo.create({
        name: 'Test Division',
        code: 'TEST',
        description: longDescription,
      })

      expect(division.description).toBe(longDescription)
    })

    it('should handle null to undefined conversion for description', async () => {
      const division = await repo.create({
        name: 'Test Division',
        code: 'TEST',
        description: null as any, // Simulating null from input
      })

      expect(division.description).toBeUndefined()
    })
  })
})
