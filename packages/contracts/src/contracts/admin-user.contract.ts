import { initContract } from '@ts-rest/core'
import * as v from 'valibot'
import {
  CreateAdminUserSchema,
  UpdateAdminUserSchema,
  ResetPasswordSchema,
  AdminUserResponseSchema,
  AdminUserListResponseSchema,
  MessageResponseSchema,
  AdminUserIdParamSchema,
} from '../schemas/admin-user.schema.js'
import { ErrorResponseSchema } from '../schemas/common.schema.js'

const c = initContract()

/**
 * Admin user management contract
 *
 * Role hierarchy (privilege escalation checks):
 * - quartermaster: Cannot manage other users
 * - admin: Can manage quartermaster and admin accounts only
 * - developer: Can manage all accounts
 *
 * Features:
 * - CRUD operations for admin users
 * - Password reset (admin-initiated)
 * - Soft delete (disable/enable accounts)
 * - Privilege escalation protection
 * - Audit logging for all operations
 */
export const adminUserContract = c.router({
  /**
   * List all admin users (including disabled accounts)
   * Requires: admin or developer role
   */
  getAdminUsers: {
    method: 'GET',
    path: '/api/admin-users',
    responses: {
      200: AdminUserListResponseSchema,
      401: ErrorResponseSchema,
      403: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'List all admin users',
    description: 'Get list of all admin users including disabled accounts. Requires admin or developer role.',
  },

  /**
   * Get admin user by ID
   * Requires: admin or developer role
   */
  getAdminUserById: {
    method: 'GET',
    path: '/api/admin-users/:id',
    pathParams: AdminUserIdParamSchema,
    responses: {
      200: AdminUserResponseSchema,
      401: ErrorResponseSchema,
      403: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Get admin user by ID',
    description: 'Retrieve admin user details by ID. Requires admin or developer role.',
  },

  /**
   * Create new admin user
   * Requires: admin or developer role
   * Privilege check: Cannot create users with higher role than actor
   */
  createAdminUser: {
    method: 'POST',
    path: '/api/admin-users',
    body: CreateAdminUserSchema,
    responses: {
      201: AdminUserResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      403: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Create new admin user',
    description:
      'Create a new admin user with role-based access control. Admins cannot create developer accounts (privilege escalation protection).',
  },

  /**
   * Update admin user
   * Requires: admin or developer role
   * Privilege check: Cannot update users with higher role than actor
   */
  updateAdminUser: {
    method: 'PUT',
    path: '/api/admin-users/:id',
    pathParams: AdminUserIdParamSchema,
    body: UpdateAdminUserSchema,
    responses: {
      200: AdminUserResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      403: ErrorResponseSchema,
      404: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Update admin user',
    description:
      'Update admin user details. Cannot modify users with higher privileges than actor. Role changes tracked in audit log.',
  },

  /**
   * Reset admin user password
   * Requires: admin or developer role
   * Privilege check: Cannot reset password for users with higher role than actor
   */
  resetAdminUserPassword: {
    method: 'POST',
    path: '/api/admin-users/:id/reset-password',
    pathParams: AdminUserIdParamSchema,
    body: ResetPasswordSchema,
    responses: {
      200: MessageResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      403: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Reset admin user password',
    description: 'Reset password for admin user (admin-initiated). Cannot reset passwords for higher-privilege users.',
  },

  /**
   * Disable admin user account (soft delete)
   * Requires: admin or developer role
   * Privilege check: Cannot disable users with higher role than actor
   * Protection: Cannot disable yourself or last developer
   */
  disableAdminUser: {
    method: 'POST',
    path: '/api/admin-users/:id/disable',
    pathParams: AdminUserIdParamSchema,
    body: v.object({}), // Empty body for POST
    responses: {
      200: MessageResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      403: ErrorResponseSchema,
      404: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Disable admin user',
    description:
      'Soft delete admin user account by disabling. Cannot disable yourself or the last active developer account.',
  },

  /**
   * Re-enable disabled admin user account
   * Requires: admin or developer role
   * Privilege check: Cannot enable users with higher role than actor
   */
  enableAdminUser: {
    method: 'POST',
    path: '/api/admin-users/:id/enable',
    pathParams: AdminUserIdParamSchema,
    body: v.object({}), // Empty body for POST
    responses: {
      200: MessageResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      403: ErrorResponseSchema,
      404: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Enable admin user',
    description: 'Re-enable a disabled admin user account. Cannot enable users with higher privileges than actor.',
  },

  /**
   * Delete admin user (hard delete)
   * Requires: developer role only
   * Protection: Cannot delete yourself or last developer
   */
  deleteAdminUser: {
    method: 'DELETE',
    path: '/api/admin-users/:id',
    pathParams: AdminUserIdParamSchema,
    responses: {
      204: v.null(),
      401: ErrorResponseSchema,
      403: ErrorResponseSchema,
      404: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Delete admin user',
    description:
      'Permanently delete admin user (developer only). Cannot delete yourself or the last active developer account.',
  },
})
