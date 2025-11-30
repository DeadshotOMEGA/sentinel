export type AdminRole = 'admin' | 'coxswain' | 'readonly';

export interface AdminUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  role: AdminRole;
  email: string;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Internal type for database operations - includes password hash
// Do NOT expose this type in API responses
export interface AdminUserWithPassword extends AdminUser {
  passwordHash: string;
}

export interface CreateAdminInput {
  username: string;
  firstName: string;
  lastName: string;
  role: AdminRole;
  email: string;
  password: string;
}
