export type AdminRole = 'admin' | 'viewer';

export interface AdminUser {
  id: string;
  username: string;
  fullName: string;
  role: AdminRole;
  lastLogin: Date | null;
  createdAt: Date;
}

// Internal type for database operations - includes password hash
// Do NOT expose this type in API responses
export interface AdminUserInternal extends AdminUser {
  passwordHash: string;
}
