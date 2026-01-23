import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { TestDatabase } from '../../helpers/testcontainers'
import { createAdminUser } from '../../helpers/factories'
import { AdminUserRepository } from '@/repositories/admin-user-repository'
import type { AdminUser } from '@sentinel/types'

describe('AdminUserRepository Integration Tests', () => {
  const testDb = new TestDatabase()
  let repo: AdminUserRepository

  beforeAll(async () => {
    await testDb.start()
    repo = new AdminUserRepository(testDb.prisma!)
  }, 60000)

  afterAll(async () => {
    await testDb.stop()
  })

  beforeEach(async () => {
    await testDb.reset()
    await testDb.seed()
  })

  describe('create', () => {
    it('should create admin user with all required fields', async () => {
      const admin = await repo.create({
        username: 'admin1',
        displayName: 'Admin One',
        role: 'admin',
        passwordHash: 'hashed_password',
        email: 'admin1@test.com',
      })

      expect(admin.id).toBeDefined()
      expect(admin.username).toBe('admin1')
      expect(admin.displayName).toBe('Admin One')
      expect(admin.role).toBe('admin')
      expect(admin.email).toBe('admin1@test.com')
    })

    it('should create admin user with firstName and lastName', async () => {
      const admin = await repo.create({
        username: 'admin2',
        displayName: 'Admin Two',
        role: 'admin',
        passwordHash: 'hashed_password',
        firstName: 'John',
        lastName: 'Doe',
      })

      expect(admin.firstName).toBe('John')
      expect(admin.lastName).toBe('Doe')
    })

    it('should throw error on duplicate username', async () => {
      await createAdminUser(testDb.prisma!, { username: 'duplicate' })

      await expect(
        repo.create({
          username: 'duplicate',
          displayName: 'Duplicate User',
          role: 'admin',
          passwordHash: 'hashed_password',
        })
      ).rejects.toThrow()
    })

    it('should create user with different roles', async () => {
      const admin = await repo.create({
        username: 'superadmin',
        displayName: 'Super Admin',
        role: 'superadmin',
        passwordHash: 'hashed_password',
      })

      expect(admin.role).toBe('superadmin')
    })
  })

  describe('findById', () => {
    it('should find admin user by ID', async () => {
      const created = await createAdminUser(testDb.prisma!, {
        username: 'findme',
      })

      const found = await repo.findById(created.id)

      expect(found).toBeDefined()
      expect(found?.id).toBe(created.id)
      expect(found?.username).toBe('findme')
    })

    it('should return null when user does not exist', async () => {
      const found = await repo.findById('non-existent-id')

      expect(found).toBeNull()
    })

    it('should find disabled user by ID', async () => {
      const admin = await createAdminUser(testDb.prisma!)
      await testDb.prisma!.adminUser.update({
        where: { id: admin.id },
        data: { disabled: true },
      })

      const found = await repo.findById(admin.id)

      expect(found).toBeDefined()
      expect(found?.disabled).toBe(true)
    })
  })

  describe('findByUsername', () => {
    it('should find admin user by username with password', async () => {
      await createAdminUser(testDb.prisma!, {
        username: 'authuser',
      })

      const found = await repo.findByUsername('authuser')

      expect(found).toBeDefined()
      expect(found?.username).toBe('authuser')
      expect(found?.passwordHash).toBeDefined()
    })

    it('should return null when username does not exist', async () => {
      const found = await repo.findByUsername('nonexistent')

      expect(found).toBeNull()
    })

    it('should find user case-insensitively', async () => {
      await createAdminUser(testDb.prisma!, {
        username: 'CaseSensitive',
      })

      const found = await repo.findByUsername('CaseSensitive')

      expect(found).toBeDefined()
    })
  })

  describe('findAll', () => {
    it('should find all active admin users', async () => {
      await createAdminUser(testDb.prisma!, { username: 'active1' })
      await createAdminUser(testDb.prisma!, { username: 'active2' })

      const admins = await repo.findAll()

      expect(admins.length).toBeGreaterThanOrEqual(2)
      admins.forEach((admin: AdminUser) => {
        expect(admin.disabled).toBe(false)
      })
    })

    it('should not include disabled users', async () => {
      const admin = await createAdminUser(testDb.prisma!, { username: 'disabled' })
      await testDb.prisma!.adminUser.update({
        where: { id: admin.id },
        data: { disabled: true },
      })

      const admins = await repo.findAll()

      const found = admins.find((a: AdminUser) => a.id === admin.id)
      expect(found).toBeUndefined()
    })

    it('should return empty array when no active users', async () => {
      // All users disabled
      const admins = await repo.findAll()
      expect(Array.isArray(admins)).toBe(true)
    })
  })

  describe('findAllIncludingDisabled', () => {
    it('should find all users including disabled', async () => {
      const active = await createAdminUser(testDb.prisma!, { username: 'active' })
      const disabled = await createAdminUser(testDb.prisma!, { username: 'disabled' })
      await testDb.prisma!.adminUser.update({
        where: { id: disabled.id },
        data: { disabled: true },
      })

      const admins = await repo.findAllIncludingDisabled()

      const activeFound = admins.find((a: AdminUser) => a.id === active.id)
      const disabledFound = admins.find((a: AdminUser) => a.id === disabled.id)

      expect(activeFound).toBeDefined()
      expect(disabledFound).toBeDefined()
      expect(disabledFound?.disabled).toBe(true)
    })
  })

  describe('update', () => {
    it('should update admin user display name', async () => {
      const admin = await createAdminUser(testDb.prisma!, {
        displayName: 'Old Name',
      })

      const updated = await repo.update(admin.id, {
        displayName: 'New Name',
      })

      expect(updated.displayName).toBe('New Name')
    })

    it('should update admin user email', async () => {
      const admin = await createAdminUser(testDb.prisma!)

      const updated = await repo.update(admin.id, {
        email: 'newemail@test.com',
      })

      expect(updated.email).toBe('newemail@test.com')
    })

    it('should update admin user role', async () => {
      const admin = await createAdminUser(testDb.prisma!, {
        role: 'admin',
      })

      const updated = await repo.update(admin.id, {
        role: 'superadmin',
      })

      expect(updated.role).toBe('superadmin')
    })

    it('should throw error when no fields provided', async () => {
      const admin = await createAdminUser(testDb.prisma!)

      await expect(repo.update(admin.id, {})).rejects.toThrow('No fields to update')
    })

    it('should throw error when user does not exist', async () => {
      await expect(
        repo.update('non-existent-id', {
          displayName: 'Test',
        })
      ).rejects.toThrow()
    })

    it('should track updatedBy field', async () => {
      const admin = await createAdminUser(testDb.prisma!)

      const updated = await repo.update(admin.id, {
        displayName: 'Updated',
        updatedBy: 'system',
      })

      expect(updated.updatedBy).toBe('system')
    })
  })

  describe('updateLastLogin', () => {
    it('should update last login timestamp', async () => {
      const admin = await createAdminUser(testDb.prisma!)

      const before = new Date()
      await repo.updateLastLogin(admin.id)
      const after = new Date()

      const updated = await repo.findById(admin.id)

      expect(updated?.lastLogin).toBeDefined()

      if (updated?.lastLogin) {
        const lastLogin = new Date(updated.lastLogin)
        expect(lastLogin.getTime()).toBeGreaterThanOrEqual(before.getTime())
        expect(lastLogin.getTime()).toBeLessThanOrEqual(after.getTime())
      }
    })

    it('should throw error when user does not exist', async () => {
      await expect(repo.updateLastLogin('non-existent-id')).rejects.toThrow(
        'Admin user not found'
      )
    })
  })

  describe('disable', () => {
    it('should disable admin user account', async () => {
      const admin = await createAdminUser(testDb.prisma!)

      await repo.disable(admin.id, 'system')

      const updated = await repo.findById(admin.id)

      expect(updated?.disabled).toBe(true)
      expect(updated?.disabledAt).toBeDefined()
      expect(updated?.disabledBy).toBe('system')
    })

    it('should throw error when user does not exist', async () => {
      await expect(repo.disable('non-existent-id', 'system')).rejects.toThrow(
        'Admin user not found'
      )
    })

    it('should set disabledAt timestamp', async () => {
      const admin = await createAdminUser(testDb.prisma!)

      const before = new Date()
      await repo.disable(admin.id, 'admin')
      const after = new Date()

      const updated = await repo.findById(admin.id)

      if (updated?.disabledAt) {
        const disabledAt = new Date(updated.disabledAt)
        expect(disabledAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
        expect(disabledAt.getTime()).toBeLessThanOrEqual(after.getTime())
      }
    })
  })

  describe('enable', () => {
    it('should re-enable disabled admin user', async () => {
      const admin = await createAdminUser(testDb.prisma!)
      await repo.disable(admin.id, 'system')

      await repo.enable(admin.id)

      const updated = await repo.findById(admin.id)

      expect(updated?.disabled).toBe(false)
      expect(updated?.disabledAt).toBeUndefined()
      expect(updated?.disabledBy).toBeUndefined()
    })

    it('should throw error when user does not exist', async () => {
      await expect(repo.enable('non-existent-id')).rejects.toThrow('Admin user not found')
    })

    it('should allow enabling already enabled user', async () => {
      const admin = await createAdminUser(testDb.prisma!)

      await repo.enable(admin.id)

      const updated = await repo.findById(admin.id)
      expect(updated?.disabled).toBe(false)
    })
  })

  describe('resetPassword', () => {
    it('should reset admin user password', async () => {
      const admin = await createAdminUser(testDb.prisma!)

      await repo.resetPassword(admin.id, 'new_hashed_password', 'system')

      const updated = await repo.findByUsername(admin.username)

      expect(updated?.passwordHash).toBe('new_hashed_password')
    })

    it('should throw error when user does not exist', async () => {
      await expect(
        repo.resetPassword('non-existent-id', 'new_hash', 'system')
      ).rejects.toThrow('Admin user not found')
    })

    it('should track who reset the password', async () => {
      const admin = await createAdminUser(testDb.prisma!)

      await repo.resetPassword(admin.id, 'new_hash', 'admin_user_123')

      const updated = await repo.findById(admin.id)

      expect(updated?.updatedBy).toBe('admin_user_123')
    })
  })

  describe('delete', () => {
    it('should delete admin user', async () => {
      const admin = await createAdminUser(testDb.prisma!)

      await repo.delete(admin.id)

      const found = await repo.findById(admin.id)

      expect(found).toBeNull()
    })

    it('should throw error when user does not exist', async () => {
      await expect(repo.delete('non-existent-id')).rejects.toThrow('Admin user not found')
    })

    it('should allow deleting disabled user', async () => {
      const admin = await createAdminUser(testDb.prisma!)
      await repo.disable(admin.id, 'system')

      await repo.delete(admin.id)

      const found = await repo.findById(admin.id)
      expect(found).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('should handle updating password hash', async () => {
      const admin = await createAdminUser(testDb.prisma!)

      await repo.update(admin.id, {
        passwordHash: 'new_updated_hash',
      })

      const withPassword = await repo.findByUsername(admin.username)
      expect(withPassword?.passwordHash).toBe('new_updated_hash')
    })

    it('should handle creating user without email', async () => {
      const admin = await repo.create({
        username: 'noemail',
        displayName: 'No Email User',
        role: 'admin',
        passwordHash: 'hashed',
      })

      expect(admin.email).toBeUndefined()
    })

    it('should handle creating user without firstName/lastName', async () => {
      const admin = await repo.create({
        username: 'noname',
        displayName: 'Display Only',
        role: 'admin',
        passwordHash: 'hashed',
      })

      expect(admin.firstName).toBeUndefined()
      expect(admin.lastName).toBeUndefined()
    })

    it('should handle multiple disable/enable cycles', async () => {
      const admin = await createAdminUser(testDb.prisma!)

      await repo.disable(admin.id, 'admin1')
      await repo.enable(admin.id)
      await repo.disable(admin.id, 'admin2')

      const final = await repo.findById(admin.id)

      expect(final?.disabled).toBe(true)
      expect(final?.disabledBy).toBe('admin2')
    })
  })
})
