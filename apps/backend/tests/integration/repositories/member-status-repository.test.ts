import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { TestDatabase } from '../../helpers/testcontainers'
import { MemberStatusRepository } from '../../../src/repositories/member-status-repository'
import type { CreateMemberStatusInput, UpdateMemberStatusInput } from '@sentinel/types'

describe('MemberStatusRepository Integration Tests', () => {
  const testDb = new TestDatabase()
  let repo: MemberStatusRepository

  beforeAll(async () => {
    await testDb.start()
    repo = new MemberStatusRepository(testDb.prisma!)
  }, 60000)

  afterAll(async () => {
    await testDb.stop()
  })

  beforeEach(async () => {
    await testDb.reset()
  })

  describe('create', () => {
    it('should create a member status with all fields', async () => {
      const input: CreateMemberStatusInput = {
        code: 'ACTIVE',
        name: 'Active Member',
        description: 'Member is currently active',
        color: '#00FF00',
      }

      const status = await repo.create(input)

      expect(status.id).toBeDefined()
      expect(status.code).toBe('ACTIVE')
      expect(status.name).toBe('Active Member')
      expect(status.description).toBe('Member is currently active')
      expect(status.color).toBe('#00FF00')
      expect(status.createdAt).toBeInstanceOf(Date)
      expect(status.updatedAt).toBeInstanceOf(Date)
    })

    it('should create member status without optional fields', async () => {
      const input: CreateMemberStatusInput = {
        code: 'INACTIVE',
        name: 'Inactive',
      }

      const status = await repo.create(input)

      expect(status.code).toBe('INACTIVE')
      expect(status.name).toBe('Inactive')
      expect(status.description).toBeUndefined()
      expect(status.color).toBeUndefined()
    })

    it('should throw error on duplicate code', async () => {
      await repo.create({ code: 'DUPLICATE', name: 'Duplicate Status' })

      await expect(repo.create({ code: 'DUPLICATE', name: 'Another Status' })).rejects.toThrow()
    })
  })

  describe('findAll', () => {
    it('should return empty array when no statuses exist', async () => {
      const statuses = await repo.findAll()
      expect(statuses).toEqual([])
    })

    it('should return all statuses ordered by name', async () => {
      await repo.create({ code: 'C', name: 'Charlie' })
      await repo.create({ code: 'A', name: 'Alpha' })
      await repo.create({ code: 'B', name: 'Bravo' })

      const statuses = await repo.findAll()

      expect(statuses).toHaveLength(3)
      expect(statuses[0].name).toBe('Alpha')
      expect(statuses[1].name).toBe('Bravo')
      expect(statuses[2].name).toBe('Charlie')
    })
  })

  describe('findById', () => {
    it('should find existing member status by ID', async () => {
      const created = await repo.create({
        code: 'TEST',
        name: 'Test Status',
      })

      const found = await repo.findById(created.id)

      expect(found).toBeDefined()
      expect(found?.id).toBe(created.id)
      expect(found?.code).toBe('TEST')
    })

    it('should return null when status does not exist', async () => {
      const found = await repo.findById('550e8400-e29b-41d4-a716-446655440000')
      expect(found).toBeNull()
    })

    it('should handle invalid UUID format', async () => {
      await expect(repo.findById('invalid-uuid')).rejects.toThrow()
    })
  })

  describe('findByCode', () => {
    it('should find existing member status by code', async () => {
      await repo.create({
        code: 'UNIQUE',
        name: 'Unique Status',
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
    it('should update status code', async () => {
      const created = await repo.create({
        code: 'OLD',
        name: 'Old Status',
      })

      const updated = await repo.update(created.id, { code: 'NEW' })

      expect(updated.code).toBe('NEW')
      expect(updated.name).toBe('Old Status')
    })

    it('should update status name', async () => {
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
        name: 'Old Status',
        description: 'Old description',
      })

      const update: UpdateMemberStatusInput = {
        code: 'NEW',
        name: 'New Status',
        description: 'New description',
        color: '#FF0000',
      }
      const updated = await repo.update(created.id, update)

      expect(updated.code).toBe('NEW')
      expect(updated.name).toBe('New Status')
      expect(updated.description).toBe('New description')
      expect(updated.color).toBe('#FF0000')
    })

    it('should clear description when set to null', async () => {
      const created = await repo.create({
        code: 'TEST',
        name: 'Test Status',
        description: 'Has description',
      })

      const updated = await repo.update(created.id, { description: null as any })

      expect(updated.description).toBeUndefined()
    })

    it('should throw error when updating non-existent status', async () => {
      await expect(
        repo.update('550e8400-e29b-41d4-a716-446655440000', { name: 'New Name' })
      ).rejects.toThrow('Member status not found')
    })

    it('should throw error when updating with empty data', async () => {
      const created = await repo.create({
        code: 'TEST',
        name: 'Test Status',
      })

      await expect(repo.update(created.id, {})).rejects.toThrow('No fields to update')
    })

    it('should throw error on duplicate code', async () => {
      const status1 = await repo.create({ code: 'STATUS1', name: 'Status 1' })
      await repo.create({ code: 'STATUS2', name: 'Status 2' })

      await expect(repo.update(status1.id, { code: 'STATUS2' })).rejects.toThrow()
    })
  })

  describe('delete', () => {
    it('should delete existing member status', async () => {
      const created = await repo.create({
        code: 'DELETE_ME',
        name: 'To Delete',
      })

      await repo.delete(created.id)

      const found = await repo.findById(created.id)
      expect(found).toBeNull()
    })

    it('should throw error when deleting non-existent status', async () => {
      await expect(repo.delete('550e8400-e29b-41d4-a716-446655440000')).rejects.toThrow(
        'Member status not found'
      )
    })

    it('should prevent deletion when status is in use', async () => {
      const status = await repo.create({
        code: 'IN_USE',
        name: 'In Use Status',
      })

      // Create a member using this status
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
          memberStatusId: status.id,
        },
      })

      await expect(repo.delete(status.id)).rejects.toThrow(
        'Cannot delete member status with 1 assigned members'
      )
    })
  })

  describe('getUsageCount', () => {
    it('should return 0 for status with no members', async () => {
      const status = await repo.create({
        code: 'UNUSED',
        name: 'Unused Status',
      })

      const count = await repo.getUsageCount(status.id)
      expect(count).toBe(0)
    })

    it('should return correct count for status with members', async () => {
      const status = await repo.create({
        code: 'POPULAR',
        name: 'Popular Status',
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
            rank: 'AB',
            firstName: 'John',
            lastName: 'Doe',
            divisionId: division.id,
            status: 'ACTIVE',
            memberType: 'REGULAR',
            memberStatusId: status.id,
          },
          {
            serviceNumber: 'SN002',
            rank: 'LS',
            firstName: 'Jane',
            lastName: 'Smith',
            divisionId: division.id,
            status: 'ACTIVE',
            memberType: 'REGULAR',
            memberStatusId: status.id,
          },
        ],
      })

      const count = await repo.getUsageCount(status.id)
      expect(count).toBe(2)
    })

    it('should return 0 for non-existent status', async () => {
      const count = await repo.getUsageCount('550e8400-e29b-41d4-a716-446655440000')
      expect(count).toBe(0)
    })
  })

  describe('edge cases', () => {
    it('should handle very long status names', async () => {
      const longName = 'A'.repeat(100)
      const status = await repo.create({
        code: 'LONG',
        name: longName,
      })

      expect(status.name).toBe(longName)
    })

    it('should handle special characters in names', async () => {
      const status = await repo.create({
        code: 'SPECIAL',
        name: 'Status & Special <Characters> "Quotes"',
      })

      expect(status.name).toBe('Status & Special <Characters> "Quotes"')
    })

    it('should handle hex color formats', async () => {
      const status = await repo.create({
        code: 'COLOR',
        name: 'Colored Status',
        color: '#FF0000',
      })

      expect(status.color).toBe('#FF0000')
    })
  })
})
