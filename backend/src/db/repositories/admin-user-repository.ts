import { prisma } from '../prisma';
import type { AdminUser as PrismaAdminUser } from '@prisma/client';
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

function mapToAdminUser(dbUser: Pick<PrismaAdminUser, 'id' | 'username' | 'email' | 'fullName' | 'role' | 'lastLogin' | 'createdAt'>): AdminUser {
  if (!dbUser.email) {
    throw new Error(`Admin user ${dbUser.id} has no email address`);
  }

  const timestamp = dbUser.createdAt ?? new Date();
  const { firstName, lastName } = parseFullName(dbUser.fullName);
  return {
    id: dbUser.id,
    username: dbUser.username,
    firstName,
    lastName,
    role: dbUser.role as 'admin' | 'coxswain' | 'readonly',
    email: dbUser.email,
    lastLogin: dbUser.lastLogin ?? undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function mapToAdminUserWithPassword(dbUser: Pick<PrismaAdminUser, 'id' | 'username' | 'email' | 'fullName' | 'role' | 'passwordHash' | 'lastLogin' | 'createdAt'>): AdminUserWithPassword {
  if (!dbUser.email) {
    throw new Error(`Admin user ${dbUser.id} has no email address`);
  }

  const timestamp = dbUser.createdAt ?? new Date();
  const { firstName, lastName } = parseFullName(dbUser.fullName);
  return {
    id: dbUser.id,
    username: dbUser.username,
    firstName,
    lastName,
    role: dbUser.role as 'admin' | 'coxswain' | 'readonly',
    email: dbUser.email,
    passwordHash: dbUser.passwordHash,
    lastLogin: dbUser.lastLogin ?? undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export class AdminUserRepository {
  /**
   * Find all admin users
   */
  async findAll(): Promise<AdminUser[]> {
    const users = await prisma.adminUser.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        lastLogin: true,
        createdAt: true,
      },
      orderBy: {
        username: 'asc',
      },
    });

    return users.map(mapToAdminUser);
  }

  /**
   * Find admin user by ID
   */
  async findById(id: string): Promise<AdminUser | null> {
    const user = await prisma.adminUser.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        lastLogin: true,
        createdAt: true,
      },
    });

    if (!user) {
      return null;
    }

    return mapToAdminUser(user);
  }

  /**
   * Find admin user by username (includes password hash for authentication)
   */
  async findByUsername(username: string): Promise<AdminUserWithPassword | null> {
    const user = await prisma.adminUser.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        passwordHash: true,
        lastLogin: true,
        createdAt: true,
      },
    });

    if (!user) {
      return null;
    }

    return mapToAdminUserWithPassword(user);
  }

  /**
   * Create a new admin user
   */
  async create(data: CreateAdminUserData): Promise<AdminUser> {
    const fullName = buildFullName(data.firstName, data.lastName);

    const user = await prisma.adminUser.create({
      data: {
        username: data.username,
        fullName,
        role: data.role,
        email: data.email,
        passwordHash: data.passwordHash,
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        lastLogin: true,
        createdAt: true,
      },
    });

    return mapToAdminUser(user);
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(id: string): Promise<void> {
    const result = await prisma.adminUser.updateMany({
      where: { id },
      data: {
        lastLogin: new Date(),
      },
    });

    if (result.count === 0) {
      throw new Error(`Admin user not found: ${id}`);
    }
  }

  /**
   * Update an admin user
   */
  async update(id: string, data: UpdateAdminUserData): Promise<AdminUser> {
    // Build the update data object
    const updateData: {
      username?: string;
      fullName?: string;
      role?: string;
      email?: string;
      passwordHash?: string;
    } = {};

    if (data.username !== undefined) {
      updateData.username = data.username;
    }

    if (data.firstName !== undefined || data.lastName !== undefined) {
      // Need to fetch current data to merge firstName/lastName
      const current = await this.findById(id);
      if (!current) {
        throw new Error(`Admin user not found: ${id}`);
      }
      const firstName = data.firstName ?? current.firstName;
      const lastName = data.lastName ?? current.lastName;
      updateData.fullName = buildFullName(firstName, lastName);
    }

    if (data.role !== undefined) {
      updateData.role = data.role;
    }

    if (data.email !== undefined) {
      updateData.email = data.email;
    }

    if (data.passwordHash !== undefined) {
      updateData.passwordHash = data.passwordHash;
    }

    if (Object.keys(updateData).length === 0) {
      throw new Error('No fields to update');
    }

    const user = await prisma.adminUser.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        lastLogin: true,
        createdAt: true,
      },
    });

    return mapToAdminUser(user);
  }

  /**
   * Delete an admin user
   */
  async delete(id: string): Promise<void> {
    const result = await prisma.adminUser.deleteMany({
      where: { id },
    });

    if (result.count === 0) {
      throw new Error(`Admin user not found: ${id}`);
    }
  }
}

export const adminUserRepository = new AdminUserRepository();
