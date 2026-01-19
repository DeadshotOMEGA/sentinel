import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../auth/middleware';
import { adminUserRepository } from '../db/repositories/admin-user-repository';
import { auditRepository } from '../db/repositories/audit-repository';
import { hashPassword } from '../auth/password';
import { passwordSchema } from '../utils/password-policy';
import { prisma } from '../db/prisma';
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
  ConflictError,
} from '../utils/errors';
import type { AdminRole } from '../../../shared/types';
import { apiLogger } from '../utils/logger';

const router = Router();

// Validation schemas
const createUserSchema = z.object({
  username: z.string().min(3).max(100),
  displayName: z.string().min(1).max(200),
  password: passwordSchema,
  role: z.enum(['quartermaster', 'admin', 'developer']),
});

const updateUserSchema = z.object({
  username: z.string().min(3).max(100).optional(),
  displayName: z.string().min(1).max(200).optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().max(255).optional(),
  role: z.enum(['quartermaster', 'admin', 'developer']).optional(),
});

const resetPasswordSchema = z.object({
  newPassword: passwordSchema,
});

/**
 * Check if actor can manage target role (privilege escalation check)
 * - Admins can only manage quartermaster and admin accounts
 * - Developers can manage all accounts
 */
function canManageRole(actorRole: string, targetRole: AdminRole): boolean {
  if (actorRole === 'developer') {
    return true;
  }
  if (actorRole === 'admin') {
    return targetRole !== 'developer';
  }
  return false;
}

function getClientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

// GET /admin-users - List all users (including disabled)
router.get(
  '/',
  requireAuth,
  requireRole('admin', 'developer'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await adminUserRepository.findAllIncludingDisabled();
      res.json({ users });
    } catch (err) {
      next(err);
    }
  }
);

// POST /admin-users - Create user
router.post(
  '/',
  requireAuth,
  requireRole('admin', 'developer'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      apiLogger.info('Creating new admin user', {
        username: req.body.username,
        role: req.body.role,
        actorId: req.user?.id,
      });

      const validationResult = createUserSchema.safeParse(req.body);
      if (!validationResult.success) {
        apiLogger.warn('User creation validation failed', {
          username: req.body.username,
          errors: validationResult.error.errors,
        });
        throw new ValidationError(
          'Invalid user data',
          validationResult.error.message,
          'Please check all required fields and password requirements.'
        );
      }

      const data = validationResult.data;
      const actorRole = req.user?.role ?? '';

      // Privilege escalation check
      if (!canManageRole(actorRole, data.role)) {
        throw new ForbiddenError(
          'Cannot create user with higher privileges',
          `Your role (${actorRole}) cannot create accounts with the ${data.role} role.`,
          'Contact a developer to create this account.'
        );
      }

      // Check for duplicate username
      const existingByUsername = await prisma.adminUser.findUnique({
        where: { username: data.username },
      });
      if (existingByUsername) {
        throw new ConflictError(
          'Username already exists',
          `The username "${data.username}" is already in use.`,
          'Please choose a different username.'
        );
      }

      // Hash password
      const passwordHash = await hashPassword(data.password);

      // Create user
      const user = await adminUserRepository.create({
        username: data.username,
        displayName: data.displayName,
        role: data.role,
        passwordHash,
      });

      // Audit log
      await auditRepository.log({
        adminUserId: req.user?.id ?? null,
        action: 'user_created',
        entityType: 'admin_user',
        entityId: user.id,
        details: {
          targetUsername: user.username,
          targetRole: user.role,
        },
        ipAddress: getClientIp(req),
      });

      apiLogger.info('Admin user created successfully', {
        userId: user.id,
        username: user.username,
        role: user.role,
      });

      res.status(201).json({ user });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /admin-users/:id - Update user
router.put(
  '/:id',
  requireAuth,
  requireRole('admin', 'developer'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const validationResult = updateUserSchema.safeParse(req.body);
      if (!validationResult.success) {
        throw new ValidationError(
          'Invalid user data',
          validationResult.error.message,
          'Please check all fields and try again.'
        );
      }

      const data = validationResult.data;
      const actorRole = req.user?.role ?? '';

      // Check if user exists
      const existingUser = await adminUserRepository.findById(id);
      if (!existingUser) {
        throw new NotFoundError(
          'User not found',
          `Admin user ${id} not found`,
          'Please check the user ID and try again.'
        );
      }

      // Privilege escalation check for current user role
      if (!canManageRole(actorRole, existingUser.role)) {
        throw new ForbiddenError(
          'Cannot modify user with higher privileges',
          `Your role (${actorRole}) cannot modify accounts with the ${existingUser.role} role.`,
          'Contact a developer to modify this account.'
        );
      }

      // Privilege escalation check for target role (if changing role)
      if (data.role && !canManageRole(actorRole, data.role)) {
        throw new ForbiddenError(
          'Cannot assign higher role',
          `Your role (${actorRole}) cannot assign the ${data.role} role.`,
          'Contact a developer to change this user\'s role.'
        );
      }

      // Check for duplicate username
      if (data.username && data.username !== existingUser.username) {
        const existingByUsername = await prisma.adminUser.findUnique({
          where: { username: data.username },
        });
        if (existingByUsername) {
          throw new ConflictError(
            'Username already exists',
            `The username "${data.username}" is already in use.`,
            'Please choose a different username.'
          );
        }
      }

      // Check for duplicate email
      if (data.email && data.email !== existingUser.email) {
        const existingByEmail = await prisma.adminUser.findFirst({
          where: { email: data.email },
        });
        if (existingByEmail) {
          throw new ConflictError(
            'Email already exists',
            `The email "${data.email}" is already in use.`,
            'Please use a different email address.'
          );
        }
      }

      // Track role change for audit
      const roleChanged = data.role && data.role !== existingUser.role;

      // Update user
      const user = await adminUserRepository.update(id, data, req.user?.id);

      // Audit log
      await auditRepository.log({
        adminUserId: req.user?.id ?? null,
        action: roleChanged ? 'role_changed' : 'user_updated',
        entityType: 'admin_user',
        entityId: user.id,
        details: {
          targetUsername: user.username,
          changes: data,
          previousRole: roleChanged ? existingUser.role : undefined,
          newRole: roleChanged ? data.role : undefined,
        },
        ipAddress: getClientIp(req),
      });

      res.json({ user });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /admin-users/:id - Delete user (developer only)
router.delete(
  '/:id',
  requireAuth,
  requireRole('developer'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      // Cannot delete yourself
      if (req.user?.id === id) {
        throw new ForbiddenError(
          'Cannot delete yourself',
          'You cannot delete your own account.',
          'Have another developer delete your account if needed.'
        );
      }

      // Check if user exists
      const existingUser = await adminUserRepository.findById(id);
      if (!existingUser) {
        throw new NotFoundError(
          'User not found',
          `Admin user ${id} not found`,
          'Please check the user ID and try again.'
        );
      }

      // Cannot delete last developer
      if (existingUser.role === 'developer') {
        const developerCount = await prisma.adminUser.count({
          where: {
            role: 'developer',
            disabled: false,
          },
        });

        if (developerCount <= 1) {
          throw new ConflictError(
            'Cannot delete last developer',
            'There must be at least one active developer account.',
            'Create another developer account before deleting this one.'
          );
        }
      }

      // Delete user
      await adminUserRepository.delete(id);

      // Audit log
      await auditRepository.log({
        adminUserId: req.user?.id ?? null,
        action: 'user_deleted',
        entityType: 'admin_user',
        entityId: id,
        details: {
          targetUsername: existingUser.username,
          targetRole: existingUser.role,
        },
        ipAddress: getClientIp(req),
      });

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

// POST /admin-users/:id/disable - Disable user
router.post(
  '/:id/disable',
  requireAuth,
  requireRole('admin', 'developer'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const actorRole = req.user?.role ?? '';

      // Cannot disable yourself
      if (req.user?.id === id) {
        throw new ForbiddenError(
          'Cannot disable yourself',
          'You cannot disable your own account.',
          'Have another administrator disable your account if needed.'
        );
      }

      // Check if user exists
      const existingUser = await adminUserRepository.findById(id);
      if (!existingUser) {
        throw new NotFoundError(
          'User not found',
          `Admin user ${id} not found`,
          'Please check the user ID and try again.'
        );
      }

      // Privilege escalation check
      if (!canManageRole(actorRole, existingUser.role)) {
        throw new ForbiddenError(
          'Cannot disable user with higher privileges',
          `Your role (${actorRole}) cannot disable accounts with the ${existingUser.role} role.`,
          'Contact a developer to disable this account.'
        );
      }

      // Cannot disable last developer
      if (existingUser.role === 'developer') {
        const developerCount = await prisma.adminUser.count({
          where: {
            role: 'developer',
            disabled: false,
          },
        });

        if (developerCount <= 1) {
          throw new ConflictError(
            'Cannot disable last developer',
            'There must be at least one active developer account.',
            'Create another developer account before disabling this one.'
          );
        }
      }

      // Already disabled?
      if (existingUser.disabled) {
        throw new ConflictError(
          'User already disabled',
          `User "${existingUser.username}" is already disabled.`,
          'No action needed.'
        );
      }

      // Disable user
      await adminUserRepository.disable(id, req.user?.id ?? 'unknown');

      // Audit log
      await auditRepository.log({
        adminUserId: req.user?.id ?? null,
        action: 'user_disabled',
        entityType: 'admin_user',
        entityId: id,
        details: {
          targetUsername: existingUser.username,
          targetRole: existingUser.role,
        },
        ipAddress: getClientIp(req),
      });

      res.json({ message: 'User disabled successfully' });
    } catch (err) {
      next(err);
    }
  }
);

// POST /admin-users/:id/enable - Enable user
router.post(
  '/:id/enable',
  requireAuth,
  requireRole('admin', 'developer'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const actorRole = req.user?.role ?? '';

      // Check if user exists
      const existingUser = await adminUserRepository.findById(id);
      if (!existingUser) {
        throw new NotFoundError(
          'User not found',
          `Admin user ${id} not found`,
          'Please check the user ID and try again.'
        );
      }

      // Privilege escalation check
      if (!canManageRole(actorRole, existingUser.role)) {
        throw new ForbiddenError(
          'Cannot enable user with higher privileges',
          `Your role (${actorRole}) cannot enable accounts with the ${existingUser.role} role.`,
          'Contact a developer to enable this account.'
        );
      }

      // Already enabled?
      if (!existingUser.disabled) {
        throw new ConflictError(
          'User already enabled',
          `User "${existingUser.username}" is already enabled.`,
          'No action needed.'
        );
      }

      // Enable user
      await adminUserRepository.enable(id);

      // Audit log
      await auditRepository.log({
        adminUserId: req.user?.id ?? null,
        action: 'user_enabled',
        entityType: 'admin_user',
        entityId: id,
        details: {
          targetUsername: existingUser.username,
          targetRole: existingUser.role,
        },
        ipAddress: getClientIp(req),
      });

      res.json({ message: 'User enabled successfully' });
    } catch (err) {
      next(err);
    }
  }
);

// POST /admin-users/:id/reset-password - Reset password
router.post(
  '/:id/reset-password',
  requireAuth,
  requireRole('admin', 'developer'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const actorRole = req.user?.role ?? '';

      const validationResult = resetPasswordSchema.safeParse(req.body);
      if (!validationResult.success) {
        throw new ValidationError(
          'Invalid password',
          validationResult.error.message,
          'Please ensure the password meets all requirements.'
        );
      }

      const { newPassword } = validationResult.data;

      // Check if user exists
      const existingUser = await adminUserRepository.findById(id);
      if (!existingUser) {
        throw new NotFoundError(
          'User not found',
          `Admin user ${id} not found`,
          'Please check the user ID and try again.'
        );
      }

      // Privilege escalation check
      if (!canManageRole(actorRole, existingUser.role)) {
        throw new ForbiddenError(
          'Cannot reset password for user with higher privileges',
          `Your role (${actorRole}) cannot reset passwords for accounts with the ${existingUser.role} role.`,
          'Contact a developer to reset this user\'s password.'
        );
      }

      // Hash new password
      const passwordHash = await hashPassword(newPassword);

      // Reset password
      await adminUserRepository.resetPassword(id, passwordHash, req.user?.id ?? 'unknown');

      // Audit log
      await auditRepository.log({
        adminUserId: req.user?.id ?? null,
        action: 'password_reset',
        entityType: 'admin_user',
        entityId: id,
        details: {
          targetUsername: existingUser.username,
          targetRole: existingUser.role,
        },
        ipAddress: getClientIp(req),
      });

      res.json({ message: 'Password reset successfully' });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
