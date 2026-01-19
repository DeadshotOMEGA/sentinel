import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../auth/middleware';
import { auditRepository, type AuditAction } from '../db/repositories/audit-repository';
import { adminUserRepository } from '../db/repositories/admin-user-repository';
import { NotFoundError, ValidationError } from '../utils/errors';

const router = Router();

// User management related actions for filtering
const USER_AUDIT_ACTIONS: AuditAction[] = [
  'user_created',
  'user_updated',
  'user_deleted',
  'user_disabled',
  'user_enabled',
  'password_reset',
  'role_changed',
  'login',
  'logout',
  'login_failed',
  'admin_create',
  'admin_update',
  'admin_delete',
];

// Query params schema for audit logs
const auditLogsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  action: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const actions = val.split(',').map((a) => a.trim()) as AuditAction[];
      return actions.length === 1 ? actions[0] : actions;
    }),
  actorId: z.string().uuid().optional(),
  targetUserId: z.string().uuid().optional(),
  startDate: z
    .string()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  endDate: z
    .string()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
});

// GET /audit-logs - Query with pagination and filters
router.get(
  '/',
  requireAuth,
  requireRole('admin', 'developer'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResult = auditLogsQuerySchema.safeParse(req.query);
      if (!validationResult.success) {
        throw new ValidationError(
          'Invalid query parameters',
          validationResult.error.message,
          'Please check pagination and filter parameters.'
        );
      }

      const { page, limit, action, actorId, targetUserId, startDate, endDate } =
        validationResult.data;

      // Build filters
      const filters = {
        action: action ?? USER_AUDIT_ACTIONS,
        actorId,
        entityId: targetUserId,
        startDate,
        endDate,
      };

      // Get paginated results
      const [logs, totalCount] = await Promise.all([
        auditRepository.findUserAuditLogs(filters, { page, limit }),
        auditRepository.countUserAuditLogs(filters),
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      res.json({
        logs,
        pagination: {
          page,
          limit,
          totalItems: totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /audit-logs/user/:userId - Get logs for specific user
router.get(
  '/user/:userId',
  requireAuth,
  requireRole('admin', 'developer'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;

      // Validate userId is a UUID
      const uuidSchema = z.string().uuid();
      const uuidResult = uuidSchema.safeParse(userId);
      if (!uuidResult.success) {
        throw new ValidationError(
          'Invalid user ID',
          'User ID must be a valid UUID.',
          'Please provide a valid user ID.'
        );
      }

      // Check if user exists
      const user = await adminUserRepository.findById(userId);
      if (!user) {
        throw new NotFoundError(
          'User not found',
          `Admin user ${userId} not found`,
          'Please check the user ID and try again.'
        );
      }

      // Parse pagination from query
      const paginationSchema = z.object({
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
      });

      const paginationResult = paginationSchema.safeParse(req.query);
      if (!paginationResult.success) {
        throw new ValidationError(
          'Invalid pagination parameters',
          paginationResult.error.message,
          'Please check pagination parameters (page >= 1, limit 1-100).'
        );
      }

      const { page, limit } = paginationResult.data;

      // Get logs where user is either the actor or the target
      const [logsAsActor, logsAsTarget] = await Promise.all([
        auditRepository.findUserAuditLogs(
          {
            actorId: userId,
            action: USER_AUDIT_ACTIONS,
          },
          { page: 1, limit: 1000 } // Get all to merge and paginate
        ),
        auditRepository.findUserAuditLogs(
          {
            entityId: userId,
            action: USER_AUDIT_ACTIONS,
          },
          { page: 1, limit: 1000 }
        ),
      ]);

      // Merge and deduplicate logs
      const logMap = new Map<string, (typeof logsAsActor)[0]>();
      for (const log of [...logsAsActor, ...logsAsTarget]) {
        logMap.set(log.id, log);
      }

      // Sort by createdAt descending
      const allLogs = Array.from(logMap.values()).sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      // Paginate
      const totalCount = allLogs.length;
      const totalPages = Math.ceil(totalCount / limit);
      const startIndex = (page - 1) * limit;
      const paginatedLogs = allLogs.slice(startIndex, startIndex + limit);

      res.json({
        user: {
          id: user.id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        logs: paginatedLogs,
        pagination: {
          page,
          limit,
          totalItems: totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
