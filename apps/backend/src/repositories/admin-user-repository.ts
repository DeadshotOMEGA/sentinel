import type { PrismaClientInstance, AdminUser as PrismaAdminUser } from '@sentinel/database'
import { prisma as defaultPrisma } from '@sentinel/database'
import type {
  AdminUser,
  AdminUserWithPassword,
  AdminRole,
} from '@sentinel/types'

interface CreateAdminUserData {
  username: string;
  displayName: string;
  role: AdminRole;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface UpdateAdminUserData {
  username?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  role?: AdminRole;
  email?: string;
  passwordHash?: string;
  disabled?: boolean;
  disabledAt?: Date | null;
  disabledBy?: string | null;
  updatedBy?: string;
}

function buildFullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`;
}

function mapToAdminUser(dbUser: Pick<PrismaAdminUser, 'id' | 'username' | 'email' | 'displayName' | 'first_name' | 'last_name' | 'role' | 'lastLogin' | 'createdAt' | 'disabled' | 'disabledAt' | 'disabledBy' | 'updatedBy'>): AdminUser {
  const timestamp = dbUser.createdAt ?? new Date();
  return {
    id: dbUser.id,
    username: dbUser.username,
    displayName: dbUser.displayName,
    firstName: dbUser.first_name ?? undefined,
    lastName: dbUser.last_name ?? undefined,
    role: dbUser.role as AdminRole,
    email: dbUser.email ?? undefined,
    lastLogin: dbUser.lastLogin ?? undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
    disabled: dbUser.disabled,
    disabledAt: dbUser.disabledAt ?? undefined,
    disabledBy: dbUser.disabledBy ?? undefined,
    updatedBy: dbUser.updatedBy ?? undefined,
  };
}

function mapToAdminUserWithPassword(dbUser: Pick<PrismaAdminUser, 'id' | 'username' | 'email' | 'displayName' | 'first_name' | 'last_name' | 'role' | 'passwordHash' | 'lastLogin' | 'createdAt' | 'disabled' | 'disabledAt' | 'disabledBy' | 'updatedBy'>): AdminUserWithPassword {
  const timestamp = dbUser.createdAt ?? new Date();
  return {
    id: dbUser.id,
    username: dbUser.username,
    displayName: dbUser.displayName,
    firstName: dbUser.first_name ?? undefined,
    lastName: dbUser.last_name ?? undefined,
    role: dbUser.role as AdminRole,
    email: dbUser.email ?? undefined,
    passwordHash: dbUser.passwordHash,
    lastLogin: dbUser.lastLogin ?? undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
    disabled: dbUser.disabled,
    disabledAt: dbUser.disabledAt ?? undefined,
    disabledBy: dbUser.disabledBy ?? undefined,
    updatedBy: dbUser.updatedBy ?? undefined,
  };
}

export class AdminUserRepository {
  private prisma: PrismaClientInstance

  /**
   * @param prismaClient - Optional Prisma client (injected in tests)
   */
  constructor(prismaClient?: PrismaClientInstance) {
    this.prisma = prismaClient || defaultPrisma
  }

  /**
   * Find all active admin users (excludes disabled accounts)
   */
  async findAll(): Promise<AdminUser[]> {
    const users = await this.prisma.adminUser.findMany({
      where: {
        disabled: false,
      },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        first_name: true,
        last_name: true,
        role: true,
        lastLogin: true,
        createdAt: true,
        disabled: true,
        disabledAt: true,
        disabledBy: true,
        updatedBy: true,
      },
      orderBy: {
        username: 'asc',
      },
    });

    return users.map(mapToAdminUser);
  }

  /**
   * Find all admin users including disabled accounts
   */
  async findAllIncludingDisabled(): Promise<AdminUser[]> {
    const users = await this.prisma.adminUser.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        first_name: true,
        last_name: true,
        role: true,
        lastLogin: true,
        createdAt: true,
        disabled: true,
        disabledAt: true,
        disabledBy: true,
        updatedBy: true,
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
    const user = await this.prisma.adminUser.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        first_name: true,
        last_name: true,
        role: true,
        lastLogin: true,
        createdAt: true,
        disabled: true,
        disabledAt: true,
        disabledBy: true,
        updatedBy: true,
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
    const user = await this.prisma.adminUser.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        first_name: true,
        last_name: true,
        role: true,
        passwordHash: true,
        lastLogin: true,
        createdAt: true,
        disabled: true,
        disabledAt: true,
        disabledBy: true,
        updatedBy: true,
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
    const user = await this.prisma.adminUser.create({
      data: {
        username: data.username,
        displayName: data.displayName,
        fullName: data.firstName && data.lastName ? buildFullName(data.firstName, data.lastName) : data.displayName,
        first_name: data.firstName,
        last_name: data.lastName,
        role: data.role,
        email: data.email,
        passwordHash: data.passwordHash,
      },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        first_name: true,
        last_name: true,
        role: true,
        lastLogin: true,
        createdAt: true,
        disabled: true,
        disabledAt: true,
        disabledBy: true,
        updatedBy: true,
      },
    });

    return mapToAdminUser(user);
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(id: string): Promise<void> {
    const result = await this.prisma.adminUser.updateMany({
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
  async update(id: string, data: UpdateAdminUserData, updatedBy?: string): Promise<AdminUser> {
    // Build the update data object
    const updateData: {
      username?: string;
      displayName?: string;
      fullName?: string;
      first_name?: string;
      last_name?: string;
      role?: string;
      email?: string;
      passwordHash?: string;
      disabled?: boolean;
      disabledAt?: Date | null;
      disabledBy?: string | null;
      updatedBy?: string;
    } = {};

    if (data.username !== undefined) {
      updateData.username = data.username;
    }

    if (data.displayName !== undefined) {
      updateData.displayName = data.displayName;
    }

    if (data.firstName !== undefined || data.lastName !== undefined) {
      // Need to fetch current data to merge firstName/lastName
      const current = await this.findById(id);
      if (!current) {
        throw new Error(`Admin user not found: ${id}`);
      }
      const firstName = data.firstName ?? current.firstName ?? '';
      const lastName = data.lastName ?? current.lastName ?? '';
      if (firstName && lastName) {
        updateData.fullName = buildFullName(firstName, lastName);
      }
      if (firstName) {
        updateData.first_name = firstName;
      }
      if (lastName) {
        updateData.last_name = lastName;
      }
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

    if (data.disabled !== undefined) {
      updateData.disabled = data.disabled;
    }

    if (data.disabledAt !== undefined) {
      updateData.disabledAt = data.disabledAt;
    }

    if (data.disabledBy !== undefined) {
      updateData.disabledBy = data.disabledBy;
    }

    if (updatedBy !== undefined) {
      updateData.updatedBy = updatedBy;
    }

    if (Object.keys(updateData).length === 0) {
      throw new Error('No fields to update');
    }

    const user = await this.prisma.adminUser.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        first_name: true,
        last_name: true,
        role: true,
        lastLogin: true,
        createdAt: true,
        disabled: true,
        disabledAt: true,
        disabledBy: true,
        updatedBy: true,
      },
    });

    return mapToAdminUser(user);
  }

  /**
   * Delete an admin user
   */
  async delete(id: string): Promise<void> {
    const result = await this.prisma.adminUser.deleteMany({
      where: { id },
    });

    if (result.count === 0) {
      throw new Error(`Admin user not found: ${id}`);
    }
  }

  /**
   * Disable an admin user account (soft delete)
   */
  async disable(id: string, disabledBy: string): Promise<void> {
    const result = await this.prisma.adminUser.updateMany({
      where: { id },
      data: {
        disabled: true,
        disabledAt: new Date(),
        disabledBy,
      },
    });

    if (result.count === 0) {
      throw new Error(`Admin user not found: ${id}`);
    }
  }

  /**
   * Re-enable a disabled admin user account
   */
  async enable(id: string): Promise<void> {
    const result = await this.prisma.adminUser.updateMany({
      where: { id },
      data: {
        disabled: false,
        disabledAt: null,
        disabledBy: null,
      },
    });

    if (result.count === 0) {
      throw new Error(`Admin user not found: ${id}`);
    }
  }

  /**
   * Reset an admin user's password (admin-initiated)
   */
  async resetPassword(id: string, passwordHash: string, updatedBy: string): Promise<void> {
    const result = await this.prisma.adminUser.updateMany({
      where: { id },
      data: {
        passwordHash,
        updatedBy,
      },
    });

    if (result.count === 0) {
      throw new Error(`Admin user not found: ${id}`);
    }
  }
}

export const adminUserRepository = new AdminUserRepository();
