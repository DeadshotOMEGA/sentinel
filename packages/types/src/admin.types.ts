// Admin user types

export type AdminRole = 'quartermaster' | 'admin' | 'developer'

export interface AdminUser {
  id: string
  username: string
  email?: string
  displayName: string
  fullName?: string
  firstName?: string
  lastName?: string
  role: AdminRole
  lastLogin?: Date
  createdAt: Date
  updatedAt: Date
  disabled: boolean
  disabledAt?: Date
  disabledBy?: string
  updatedBy?: string
}

export interface AdminUserWithPassword extends AdminUser {
  passwordHash: string
}

export interface CreateAdminUserInput {
  username: string
  email?: string
  password: string
  displayName: string
  fullName?: string
  firstName?: string
  lastName?: string
  role: AdminRole
}

export interface UpdateAdminUserInput {
  username?: string
  email?: string
  password?: string
  displayName?: string
  fullName?: string
  firstName?: string
  lastName?: string
  role?: AdminRole
  disabled?: boolean
}
