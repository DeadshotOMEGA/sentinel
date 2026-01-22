import { initServer } from '@ts-rest/express'
import { adminUserContract } from '@sentinel/contracts'
import type { AdminRole } from '@sentinel/types'
import { AdminUserRepository } from '../repositories/admin-user-repository.js'
import { AuditRepository } from '../repositories/audit-repository.js'
import { getPrismaClient } from '../lib/database.js'
import { apiLogger } from '../lib/logger.js'
import bcrypt from 'bcryptjs'

const s = initServer()

// Initialize repositories
const adminUserRepo = new AdminUserRepository(getPrismaClient())
const auditRepo = new AuditRepository(getPrismaClient())

/**
 * Check if actor can manage target role (privilege escalation check)
 * - Admins can only manage quartermaster and admin accounts
 * - Developers can manage all accounts
 */
function canManageRole(actorRole: string, targetRole: AdminRole): boolean {
  if (actorRole === 'developer') {
    return true
  }
  if (actorRole === 'admin') {
    return targetRole !== 'developer'
  }
  return false
}

/**
 * Get client IP address from request
 */
function getClientIp(req: unknown): string {
  const r = req as { ip?: string; socket?: { remoteAddress?: string } }
  return r.ip || r.socket?.remoteAddress || 'unknown'
}

/**
 * Hash password using bcrypt
 */
async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10
  return await bcrypt.hash(password, saltRounds)
}

/**
 * Convert repository AdminUser to API response format
 */
function toApiFormat(user: {
  id: string
  username: string
  displayName: string
  firstName?: string
  lastName?: string
  role: AdminRole
  email?: string
  lastLogin?: Date
  createdAt: Date
  updatedAt: Date
  disabled: boolean
  disabledAt?: Date
  disabledBy?: string
  updatedBy?: string
}) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    firstName: user.firstName || null,
    lastName: user.lastName || null,
    role: user.role,
    email: user.email || null,
    lastLogin: user.lastLogin?.toISOString() || null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    disabled: user.disabled,
    disabledAt: user.disabledAt?.toISOString() || null,
    disabledBy: user.disabledBy || null,
    updatedBy: user.updatedBy || null,
  }
}

/**
 * Admin user management routes
 */
export const adminUsersRouter = s.router(adminUserContract, {
  /**
   * GET /api/admin-users - List all admin users (including disabled)
   */
  getAdminUsers: async () => {
    try {
      const users = await adminUserRepo.findAllIncludingDisabled()

      return {
        status: 200 as const,
        body: {
          users: users.map(toApiFormat),
        },
      }
    } catch (error) {
      apiLogger.error('Failed to fetch admin users', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: 'Failed to fetch admin users',
        },
      }
    }
  },

  /**
   * GET /api/admin-users/:id - Get admin user by ID
   */
  getAdminUserById: async ({ params }: any) => {
    try {
      const user = await adminUserRepo.findById(params.id)

      if (!user) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Admin user with ID '${params.id}' not found`,
          },
        }
      }

      return {
        status: 200 as const,
        body: toApiFormat(user),
      }
    } catch (error) {
      apiLogger.error('Failed to fetch admin user', {
        userId: params.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: 'Failed to fetch admin user',
        },
      }
    }
  },

  /**
   * POST /api/admin-users - Create new admin user
   */
  createAdminUser: async ({ body, request }: any) => {
    try {
      const req = request as { user?: { id: string; role: string } }
      const actorRole = req.user?.role ?? ''

      apiLogger.info('Creating new admin user', {
        username: body.username,
        role: body.role,
        actorId: req.user?.id,
      })

      // Privilege escalation check
      if (!canManageRole(actorRole, body.role)) {
        apiLogger.warn('Privilege escalation attempt blocked', {
          actorRole,
          targetRole: body.role,
          username: body.username,
        })
        return {
          status: 403 as const,
          body: {
            error: 'FORBIDDEN',
            message: `Your role (${actorRole}) cannot create accounts with the ${body.role} role`,
          },
        }
      }

      // Check for duplicate username
      const existingByUsername = await getPrismaClient().adminUser.findUnique({
        where: { username: body.username },
      })
      if (existingByUsername) {
        return {
          status: 409 as const,
          body: {
            error: 'CONFLICT',
            message: `Username "${body.username}" is already in use`,
          },
        }
      }

      // Hash password
      const passwordHash = await hashPassword(body.password)

      // Create user
      const user = await adminUserRepo.create({
        username: body.username,
        displayName: body.displayName,
        role: body.role,
        passwordHash,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
      })

      // Audit log
      await auditRepo.log({
        adminUserId: req.user?.id ?? null,
        action: 'user_created',
        entityType: 'admin_user',
        entityId: user.id,
        details: {
          targetUsername: user.username,
          targetRole: user.role,
        },
        ipAddress: getClientIp(req),
      })

      apiLogger.info('Admin user created successfully', {
        userId: user.id,
        username: user.username,
        role: user.role,
      })

      return {
        status: 201 as const,
        body: toApiFormat(user),
      }
    } catch (error) {
      apiLogger.error('Failed to create admin user', {
        username: body.username,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: 'Failed to create admin user',
        },
      }
    }
  },

  /**
   * PUT /api/admin-users/:id - Update admin user
   */
  updateAdminUser: async ({ params, body, request }: any) => {
    try {
      const req = request as { user?: { id: string; role: string } }
      const actorRole = req.user?.role ?? ''

      // Check if user exists
      const existingUser = await adminUserRepo.findById(params.id)
      if (!existingUser) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Admin user with ID '${params.id}' not found`,
          },
        }
      }

      // Privilege escalation check for current user role
      if (!canManageRole(actorRole, existingUser.role)) {
        return {
          status: 403 as const,
          body: {
            error: 'FORBIDDEN',
            message: `Your role (${actorRole}) cannot modify accounts with the ${existingUser.role} role`,
          },
        }
      }

      // Privilege escalation check for target role (if changing role)
      if (body.role && !canManageRole(actorRole, body.role)) {
        return {
          status: 403 as const,
          body: {
            error: 'FORBIDDEN',
            message: `Your role (${actorRole}) cannot assign the ${body.role} role`,
          },
        }
      }

      // Check for duplicate username
      if (body.username && body.username !== existingUser.username) {
        const existingByUsername = await getPrismaClient().adminUser.findUnique({
          where: { username: body.username },
        })
        if (existingByUsername) {
          return {
            status: 409 as const,
            body: {
              error: 'CONFLICT',
              message: `Username "${body.username}" is already in use`,
            },
          }
        }
      }

      // Check for duplicate email
      if (body.email && body.email !== existingUser.email) {
        const existingByEmail = await getPrismaClient().adminUser.findFirst({
          where: { email: body.email },
        })
        if (existingByEmail) {
          return {
            status: 409 as const,
            body: {
              error: 'CONFLICT',
              message: `Email "${body.email}" is already in use`,
            },
          }
        }
      }

      // Track role change for audit
      const roleChanged = body.role && body.role !== existingUser.role

      // Update user
      const user = await adminUserRepo.update(params.id, body, req.user?.id)

      // Audit log
      await auditRepo.log({
        adminUserId: req.user?.id ?? null,
        action: roleChanged ? 'role_changed' : 'user_updated',
        entityType: 'admin_user',
        entityId: user.id,
        details: {
          targetUsername: user.username,
          changes: body,
          previousRole: roleChanged ? existingUser.role : undefined,
          newRole: roleChanged ? body.role : undefined,
        },
        ipAddress: getClientIp(req),
      })

      return {
        status: 200 as const,
        body: toApiFormat(user),
      }
    } catch (error) {
      apiLogger.error('Failed to update admin user', {
        userId: params.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: 'Failed to update admin user',
        },
      }
    }
  },

  /**
   * POST /api/admin-users/:id/reset-password - Reset admin user password
   */
  resetAdminUserPassword: async ({ params, body, request }: any) => {
    try {
      const req = request as { user?: { id: string; role: string } }
      const actorRole = req.user?.role ?? ''

      // Check if user exists
      const existingUser = await adminUserRepo.findById(params.id)
      if (!existingUser) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Admin user with ID '${params.id}' not found`,
          },
        }
      }

      // Privilege escalation check
      if (!canManageRole(actorRole, existingUser.role)) {
        return {
          status: 403 as const,
          body: {
            error: 'FORBIDDEN',
            message: `Your role (${actorRole}) cannot reset passwords for accounts with the ${existingUser.role} role`,
          },
        }
      }

      // Hash new password
      const passwordHash = await hashPassword(body.newPassword)

      // Reset password
      await adminUserRepo.resetPassword(params.id, passwordHash, req.user?.id ?? 'unknown')

      // Audit log
      await auditRepo.log({
        adminUserId: req.user?.id ?? null,
        action: 'password_reset',
        entityType: 'admin_user',
        entityId: params.id,
        details: {
          targetUsername: existingUser.username,
          targetRole: existingUser.role,
        },
        ipAddress: getClientIp(req),
      })

      return {
        status: 200 as const,
        body: {
          message: 'Password reset successfully',
        },
      }
    } catch (error) {
      apiLogger.error('Failed to reset admin user password', {
        userId: params.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: 'Failed to reset password',
        },
      }
    }
  },

  /**
   * POST /api/admin-users/:id/disable - Disable admin user account
   */
  disableAdminUser: async ({ params, request }: any) => {
    try {
      const req = request as { user?: { id: string; role: string } }
      const actorRole = req.user?.role ?? ''

      // Cannot disable yourself
      if (req.user?.id === params.id) {
        return {
          status: 403 as const,
          body: {
            error: 'FORBIDDEN',
            message: 'You cannot disable your own account',
          },
        }
      }

      // Check if user exists
      const existingUser = await adminUserRepo.findById(params.id)
      if (!existingUser) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Admin user with ID '${params.id}' not found`,
          },
        }
      }

      // Privilege escalation check
      if (!canManageRole(actorRole, existingUser.role)) {
        return {
          status: 403 as const,
          body: {
            error: 'FORBIDDEN',
            message: `Your role (${actorRole}) cannot disable accounts with the ${existingUser.role} role`,
          },
        }
      }

      // Cannot disable last developer
      if (existingUser.role === 'developer') {
        const developerCount = await getPrismaClient().adminUser.count({
          where: {
            role: 'developer',
            disabled: false,
          },
        })

        if (developerCount <= 1) {
          return {
            status: 409 as const,
            body: {
              error: 'CONFLICT',
              message: 'Cannot disable the last active developer account',
            },
          }
        }
      }

      // Already disabled?
      if (existingUser.disabled) {
        return {
          status: 409 as const,
          body: {
            error: 'CONFLICT',
            message: `User "${existingUser.username}" is already disabled`,
          },
        }
      }

      // Disable user
      await adminUserRepo.disable(params.id, req.user?.id ?? 'unknown')

      // Audit log
      await auditRepo.log({
        adminUserId: req.user?.id ?? null,
        action: 'user_disabled',
        entityType: 'admin_user',
        entityId: params.id,
        details: {
          targetUsername: existingUser.username,
          targetRole: existingUser.role,
        },
        ipAddress: getClientIp(req),
      })

      return {
        status: 200 as const,
        body: {
          message: 'User disabled successfully',
        },
      }
    } catch (error) {
      apiLogger.error('Failed to disable admin user', {
        userId: params.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: 'Failed to disable user',
        },
      }
    }
  },

  /**
   * POST /api/admin-users/:id/enable - Re-enable disabled admin user account
   */
  enableAdminUser: async ({ params, request }: any) => {
    try {
      const req = request as { user?: { id: string; role: string } }
      const actorRole = req.user?.role ?? ''

      // Check if user exists
      const existingUser = await adminUserRepo.findById(params.id)
      if (!existingUser) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Admin user with ID '${params.id}' not found`,
          },
        }
      }

      // Privilege escalation check
      if (!canManageRole(actorRole, existingUser.role)) {
        return {
          status: 403 as const,
          body: {
            error: 'FORBIDDEN',
            message: `Your role (${actorRole}) cannot enable accounts with the ${existingUser.role} role`,
          },
        }
      }

      // Already enabled?
      if (!existingUser.disabled) {
        return {
          status: 409 as const,
          body: {
            error: 'CONFLICT',
            message: `User "${existingUser.username}" is already enabled`,
          },
        }
      }

      // Enable user
      await adminUserRepo.enable(params.id)

      // Audit log
      await auditRepo.log({
        adminUserId: req.user?.id ?? null,
        action: 'user_enabled',
        entityType: 'admin_user',
        entityId: params.id,
        details: {
          targetUsername: existingUser.username,
          targetRole: existingUser.role,
        },
        ipAddress: getClientIp(req),
      })

      return {
        status: 200 as const,
        body: {
          message: 'User enabled successfully',
        },
      }
    } catch (error) {
      apiLogger.error('Failed to enable admin user', {
        userId: params.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: 'Failed to enable user',
        },
      }
    }
  },

  /**
   * DELETE /api/admin-users/:id - Delete admin user (hard delete)
   */
  deleteAdminUser: async ({ params, request }: any) => {
    try {
      const req = request as { user?: { id: string; role: string } }

      // Cannot delete yourself
      if (req.user?.id === params.id) {
        return {
          status: 403 as const,
          body: {
            error: 'FORBIDDEN',
            message: 'You cannot delete your own account',
          },
        }
      }

      // Check if user exists
      const existingUser = await adminUserRepo.findById(params.id)
      if (!existingUser) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Admin user with ID '${params.id}' not found`,
          },
        }
      }

      // Cannot delete last developer
      if (existingUser.role === 'developer') {
        const developerCount = await getPrismaClient().adminUser.count({
          where: {
            role: 'developer',
            disabled: false,
          },
        })

        if (developerCount <= 1) {
          return {
            status: 409 as const,
            body: {
              error: 'CONFLICT',
              message: 'Cannot delete the last active developer account',
            },
          }
        }
      }

      // Delete user
      await adminUserRepo.delete(params.id)

      // Audit log
      await auditRepo.log({
        adminUserId: req.user?.id ?? null,
        action: 'user_deleted',
        entityType: 'admin_user',
        entityId: params.id,
        details: {
          targetUsername: existingUser.username,
          targetRole: existingUser.role,
        },
        ipAddress: getClientIp(req),
      })

      return {
        status: 204 as const,
        body: null,
      }
    } catch (error) {
      apiLogger.error('Failed to delete admin user', {
        userId: params.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: 'Failed to delete user',
        },
      }
    }
  },
})
