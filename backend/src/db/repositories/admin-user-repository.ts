import { BaseRepository, toCamelCase } from './base-repository';
import type {
  AdminUser,
  AdminUserWithPassword,
} from '../../../../shared/types';

interface CreateAdminUserData {
  username: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'coxswain' | 'readonly';
  email: string;
  passwordHash: string;
}

interface UpdateAdminUserData {
  username?: string;
  firstName?: string;
  lastName?: string;
  role?: 'admin' | 'coxswain' | 'readonly';
  email?: string;
  passwordHash?: string;
}

function buildFullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`;
}

function parseFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(' ');
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  const lastName = parts.pop() as string;
  const firstName = parts.join(' ');
  return { firstName, lastName };
}

export class AdminUserRepository extends BaseRepository {
  /**
   * Find all admin users
   */
  async findAll(): Promise<AdminUser[]> {
    const query = `
      SELECT id, username, full_name, role, email, last_login, created_at
      FROM admin_users
      ORDER BY username
    `;

    const rows = await this.queryAll<Record<string, unknown>>(query);
    return rows.map((row) => {
      const { firstName, lastName } = parseFullName(row.full_name as string);
      return {
        id: row.id as string,
        username: row.username as string,
        firstName,
        lastName,
        role: row.role as 'admin' | 'coxswain' | 'readonly',
        email: row.email as string,
        lastLogin: row.last_login as Date | undefined,
        createdAt: row.created_at as Date,
        updatedAt: row.created_at as Date, // Use created_at as fallback
      };
    });
  }

  /**
   * Find admin user by ID
   */
  async findById(id: string): Promise<AdminUser | null> {
    const query = `
      SELECT id, username, full_name, role, email, last_login, created_at
      FROM admin_users
      WHERE id = $1
    `;

    const row = await this.queryOne<Record<string, unknown>>(query, [id]);
    if (!row) {
      return null;
    }

    const { firstName, lastName } = parseFullName(row.full_name as string);
    return {
      id: row.id as string,
      username: row.username as string,
      firstName,
      lastName,
      role: row.role as 'admin' | 'coxswain' | 'readonly',
      email: row.email as string,
      lastLogin: row.last_login as Date | undefined,
      createdAt: row.created_at as Date,
      updatedAt: row.created_at as Date, // Use created_at as fallback
    };
  }

  /**
   * Find admin user by username (includes password hash for authentication)
   */
  async findByUsername(username: string): Promise<AdminUserWithPassword | null> {
    const query = `
      SELECT id, username, full_name, role, email, password_hash, last_login, created_at
      FROM admin_users
      WHERE username = $1
    `;

    const row = await this.queryOne<Record<string, unknown>>(query, [username]);
    if (!row) {
      return null;
    }

    const { firstName, lastName } = parseFullName(row.full_name as string);
    return {
      id: row.id as string,
      username: row.username as string,
      firstName,
      lastName,
      role: row.role as 'admin' | 'coxswain' | 'readonly',
      email: row.email as string,
      passwordHash: row.password_hash as string,
      lastLogin: row.last_login as Date | undefined,
      createdAt: row.created_at as Date,
      updatedAt: row.created_at as Date, // Use created_at as fallback
    };
  }

  /**
   * Create a new admin user
   */
  async create(data: CreateAdminUserData): Promise<AdminUser> {
    const fullName = buildFullName(data.firstName, data.lastName);

    const query = `
      INSERT INTO admin_users (
        username, full_name, role, email, password_hash
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, username, full_name, role, email, last_login, created_at
    `;

    const row = await this.queryOne<Record<string, unknown>>(query, [
      data.username,
      fullName,
      data.role,
      data.email,
      data.passwordHash,
    ]);

    if (!row) {
      throw new Error('Failed to create admin user');
    }

    const { firstName, lastName } = parseFullName(row.full_name as string);
    return {
      id: row.id as string,
      username: row.username as string,
      firstName,
      lastName,
      role: row.role as 'admin' | 'coxswain' | 'readonly',
      email: row.email as string,
      lastLogin: row.last_login as Date | undefined,
      createdAt: row.created_at as Date,
      updatedAt: row.created_at as Date, // Use created_at as fallback
    };
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(id: string): Promise<void> {
    const query = `
      UPDATE admin_users
      SET last_login = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    const result = await this.query(query, [id]);
    if (result.rowCount === 0) {
      throw new Error(`Admin user not found: ${id}`);
    }
  }

  /**
   * Update an admin user
   */
  async update(id: string, data: UpdateAdminUserData): Promise<AdminUser> {
    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (data.username !== undefined) {
      updates.push(`username = $${paramIndex++}`);
      params.push(data.username);
    }
    if (data.firstName !== undefined || data.lastName !== undefined) {
      // Need to fetch current data to merge
      const current = await this.findById(id);
      if (!current) {
        throw new Error(`Admin user not found: ${id}`);
      }
      const firstName = data.firstName ?? current.firstName;
      const lastName = data.lastName ?? current.lastName;
      const fullName = buildFullName(firstName, lastName);
      updates.push(`full_name = $${paramIndex++}`);
      params.push(fullName);
    }
    if (data.role !== undefined) {
      updates.push(`role = $${paramIndex++}`);
      params.push(data.role);
    }
    if (data.email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      params.push(data.email);
    }
    if (data.passwordHash !== undefined) {
      updates.push(`password_hash = $${paramIndex++}`);
      params.push(data.passwordHash);
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    params.push(id);

    const query = `
      UPDATE admin_users
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, username, full_name, role, email, last_login, created_at
    `;

    const row = await this.queryOne<Record<string, unknown>>(query, params);
    if (!row) {
      throw new Error(`Admin user not found: ${id}`);
    }

    const { firstName, lastName } = parseFullName(row.full_name as string);
    return {
      id: row.id as string,
      username: row.username as string,
      firstName,
      lastName,
      role: row.role as 'admin' | 'coxswain' | 'readonly',
      email: row.email as string,
      lastLogin: row.last_login as Date | undefined,
      createdAt: row.created_at as Date,
      updatedAt: row.created_at as Date, // Use created_at as fallback
    };
  }

  /**
   * Delete an admin user
   */
  async delete(id: string): Promise<void> {
    const query = `
      DELETE FROM admin_users
      WHERE id = $1
    `;

    const result = await this.query(query, [id]);
    if (result.rowCount === 0) {
      throw new Error(`Admin user not found: ${id}`);
    }
  }
}

export const adminUserRepository = new AdminUserRepository();
