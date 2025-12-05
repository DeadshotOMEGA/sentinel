import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../auth';
import { ValidationError, NotFoundError } from '../utils/errors';
import type { Alert, CreateAlertInput, AlertSeverity, AlertTargetType } from '../../../shared/types';

const router = Router();

// In-memory storage for alerts (can be replaced with DB later)
const alertsStore = new Map<string, Alert>();

// Export helper to get alerts for a specific person
export function getAlertsForPerson(targetType: AlertTargetType, targetId: string): Alert[] {
  const now = new Date();
  return Array.from(alertsStore.values()).filter(alert => {
    // Must match target
    if (alert.targetType !== targetType || alert.targetId !== targetId) {
      return false;
    }
    // Filter out dismissed alerts
    if (alert.dismissed) {
      return false;
    }
    // Filter out expired alerts
    if (alert.expiresAt && new Date(alert.expiresAt) < now) {
      return false;
    }
    return true;
  });
}

// Validation schemas
const createAlertSchema = z.object({
  targetType: z.enum(['member', 'visitor']),
  targetId: z.string().uuid(),
  severity: z.enum(['info', 'warning', 'critical']),
  message: z.string().min(1).max(500),
  expiresAt: z.string().datetime().optional(),
});

const dismissAlertSchema = z.object({
  dismissedBy: z.string().uuid().optional(),
});

// Helper function to generate UUID
function generateId(): string {
  return crypto.randomUUID();
}

// Helper function to filter active alerts
function getActiveAlerts(): Alert[] {
  const now = new Date();
  return Array.from(alertsStore.values()).filter(alert => {
    // Filter out dismissed alerts
    if (alert.dismissed) {
      return false;
    }
    // Filter out expired alerts
    if (alert.expiresAt && new Date(alert.expiresAt) < now) {
      return false;
    }
    return true;
  });
}

// GET /api/alerts - List all active alerts
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activeAlerts = getActiveAlerts();
    res.json({ alerts: activeAlerts });
  } catch (err) {
    next(err);
  }
});

// GET /api/alerts/:targetType/:targetId - Get alerts for specific person
router.get('/:targetType/:targetId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { targetType, targetId } = req.params;

    // Validate targetType
    if (targetType !== 'member' && targetType !== 'visitor') {
      throw new ValidationError(
        'INVALID_TARGET_TYPE',
        `Invalid target type: ${targetType}`,
        'Target type must be either "member" or "visitor".'
      );
    }

    // Validate targetId is a UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(targetId)) {
      throw new ValidationError(
        'INVALID_TARGET_ID',
        `Invalid target ID format: ${targetId}`,
        'The target ID must be a valid UUID.'
      );
    }

    const activeAlerts = getActiveAlerts().filter(
      alert => alert.targetType === targetType && alert.targetId === targetId
    );

    res.json({ alerts: activeAlerts });
  } catch (err) {
    next(err);
  }
});

// POST /api/alerts - Create new alert
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validationResult = createAlertSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError(
        'INVALID_ALERT_DATA',
        validationResult.error.message,
        'Invalid alert data. Please check the provided fields and try again.'
      );
    }

    const { targetType, targetId, severity, message, expiresAt } = validationResult.data;
    const userId = req.user?.id;

    if (!userId) {
      throw new ValidationError(
        'USER_ID_REQUIRED',
        'User ID is required to create an alert',
        'Authentication error. Please log in again.'
      );
    }

    const alert: Alert = {
      id: generateId(),
      targetType: targetType as AlertTargetType,
      targetId,
      severity: severity as AlertSeverity,
      message,
      createdBy: userId,
      createdAt: new Date(),
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      dismissed: false,
      dismissedBy: undefined,
      dismissedAt: undefined,
    };

    alertsStore.set(alert.id, alert);

    res.status(201).json({ alert });
  } catch (err) {
    next(err);
  }
});

// PUT /api/alerts/:id/dismiss - Dismiss an alert
router.put('/:id/dismiss', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Validate id is a UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new ValidationError(
        'INVALID_ALERT_ID',
        `Invalid alert ID format: ${id}`,
        'The alert ID must be a valid UUID.'
      );
    }

    const alert = alertsStore.get(id);
    if (!alert) {
      throw new NotFoundError(
        'ALERT_NOT_FOUND',
        `Alert ${id} not found`,
        'The alert you are trying to dismiss does not exist.'
      );
    }

    if (alert.dismissed) {
      throw new ValidationError(
        'ALERT_ALREADY_DISMISSED',
        `Alert ${id} is already dismissed`,
        'This alert has already been dismissed.'
      );
    }

    const userId = req.user?.id;
    if (!userId) {
      throw new ValidationError(
        'USER_ID_REQUIRED',
        'User ID is required to dismiss an alert',
        'Authentication error. Please log in again.'
      );
    }

    // Update alert
    alert.dismissed = true;
    alert.dismissedBy = userId;
    alert.dismissedAt = new Date();

    alertsStore.set(id, alert);

    res.json({ alert });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/alerts/:id - Delete an alert (admin only)
router.delete('/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Validate id is a UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new ValidationError(
        'INVALID_ALERT_ID',
        `Invalid alert ID format: ${id}`,
        'The alert ID must be a valid UUID.'
      );
    }

    const alert = alertsStore.get(id);
    if (!alert) {
      throw new NotFoundError(
        'ALERT_NOT_FOUND',
        `Alert ${id} not found`,
        'The alert you are trying to delete does not exist.'
      );
    }

    alertsStore.delete(id);

    res.json({ success: true, message: 'Alert deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export { router as alertRoutes };
