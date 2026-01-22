import * as v from 'valibot'

/**
 * Admin user role values (hierarchy: quartermaster < admin < developer)
 */
export const AdminRoleEnum = v.picklist(['quartermaster', 'admin', 'developer'])

/**
 * Password validation schema
 * Requirements: min 12 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character
 */
export const PasswordSchema = v.pipe(
  v.string('Password is required'),
  v.minLength(12, 'Password must be at least 12 characters'),
  v.maxLength(128, 'Password must be at most 128 characters'),
  v.regex(/[A-Z]/, 'Password must contain at least one uppercase letter'),
  v.regex(/[a-z]/, 'Password must contain at least one lowercase letter'),
  v.regex(/[0-9]/, 'Password must contain at least one number'),
  v.regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
)

/**
 * Create admin user request schema
 */
export const CreateAdminUserSchema = v.object({
  username: v.pipe(
    v.string('Username is required'),
    v.minLength(3, 'Username must be at least 3 characters'),
    v.maxLength(100, 'Username must be at most 100 characters'),
    v.regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens')
  ),
  displayName: v.pipe(
    v.string('Display name is required'),
    v.minLength(1, 'Display name cannot be empty'),
    v.maxLength(200, 'Display name must be at most 200 characters')
  ),
  password: PasswordSchema,
  role: AdminRoleEnum,
  firstName: v.optional(
    v.pipe(v.string(), v.maxLength(100, 'First name must be at most 100 characters'))
  ),
  lastName: v.optional(
    v.pipe(v.string(), v.maxLength(100, 'Last name must be at most 100 characters'))
  ),
  email: v.optional(
    v.pipe(
      v.string(),
      v.email('Invalid email address'),
      v.maxLength(255, 'Email must be at most 255 characters')
    )
  ),
})

/**
 * Update admin user request schema (all fields optional)
 */
export const UpdateAdminUserSchema = v.object({
  username: v.optional(
    v.pipe(
      v.string(),
      v.minLength(3, 'Username must be at least 3 characters'),
      v.maxLength(100, 'Username must be at most 100 characters'),
      v.regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens')
    )
  ),
  displayName: v.optional(
    v.pipe(
      v.string(),
      v.minLength(1, 'Display name cannot be empty'),
      v.maxLength(200, 'Display name must be at most 200 characters')
    )
  ),
  role: v.optional(AdminRoleEnum),
  firstName: v.optional(
    v.pipe(v.string(), v.maxLength(100, 'First name must be at most 100 characters'))
  ),
  lastName: v.optional(
    v.pipe(v.string(), v.maxLength(100, 'Last name must be at most 100 characters'))
  ),
  email: v.optional(
    v.pipe(
      v.string(),
      v.email('Invalid email address'),
      v.maxLength(255, 'Email must be at most 255 characters')
    )
  ),
})

/**
 * Reset password request schema
 */
export const ResetPasswordSchema = v.object({
  newPassword: PasswordSchema,
})

/**
 * Admin user response schema (excludes password hash)
 */
export const AdminUserResponseSchema = v.object({
  id: v.pipe(v.string(), v.uuid()),
  username: v.string(),
  displayName: v.string(),
  firstName: v.optional(v.nullable(v.string())),
  lastName: v.optional(v.nullable(v.string())),
  role: AdminRoleEnum,
  email: v.optional(v.nullable(v.string())),
  lastLogin: v.optional(v.nullable(v.pipe(v.string(), v.isoTimestamp()))),
  createdAt: v.pipe(v.string(), v.isoTimestamp()),
  updatedAt: v.pipe(v.string(), v.isoTimestamp()),
  disabled: v.boolean(),
  disabledAt: v.optional(v.nullable(v.pipe(v.string(), v.isoTimestamp()))),
  disabledBy: v.optional(v.nullable(v.string())),
  updatedBy: v.optional(v.nullable(v.string())),
})

/**
 * Admin user list response schema
 */
export const AdminUserListResponseSchema = v.object({
  users: v.array(AdminUserResponseSchema),
})

/**
 * Message response schema for status operations
 */
export const MessageResponseSchema = v.object({
  message: v.string(),
})

/**
 * Path parameter schema for admin user ID
 */
export const AdminUserIdParamSchema = v.object({
  id: v.pipe(v.string(), v.uuid('Invalid admin user ID')),
})

// Export types
export type AdminRole = v.InferOutput<typeof AdminRoleEnum>
export type CreateAdminUser = v.InferOutput<typeof CreateAdminUserSchema>
export type UpdateAdminUser = v.InferOutput<typeof UpdateAdminUserSchema>
export type ResetPassword = v.InferOutput<typeof ResetPasswordSchema>
export type AdminUserResponse = v.InferOutput<typeof AdminUserResponseSchema>
export type AdminUserListResponse = v.InferOutput<typeof AdminUserListResponseSchema>
export type MessageResponse = v.InferOutput<typeof MessageResponseSchema>
