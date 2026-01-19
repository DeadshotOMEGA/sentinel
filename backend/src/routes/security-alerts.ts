import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { securityAlertService } from '../services/security-alert-service';
import { requireAuth, requireRole } from '../auth';
import { ValidationError } from '../utils/errors';

const router = Router();

// Validation schema for acknowledging an alert
const acknowledgeAlertSchema = z.object({
  note: z.string().max(1000).optional(),
});

// GET /api/security-alerts - List active security alerts
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const alerts = await securityAlertService.getActiveAlerts();
    res.json({ alerts });
  } catch (err) {
    next(err);
  }
});

// PUT /api/security-alerts/:id/acknowledge - Acknowledge a security alert
router.put(
  '/:id/acknowledge',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const validationResult = acknowledgeAlertSchema.safeParse(req.body);
      if (!validationResult.success) {
        throw new ValidationError(
          'INVALID_ACKNOWLEDGE_DATA',
          validationResult.error.message,
          'Please provide valid acknowledgment data.'
        );
      }

      if (!req.user) {
        throw new ValidationError(
          'UNAUTHORIZED',
          'User not authenticated',
          'You must be logged in to acknowledge alerts.'
        );
      }

      const alert = await securityAlertService.acknowledgeAlert(
        id,
        req.user.id,
        validationResult.data.note
      );

      res.json({ alert });
    } catch (err) {
      next(err);
    }
  }
);

export { router as securityAlertRoutes };
