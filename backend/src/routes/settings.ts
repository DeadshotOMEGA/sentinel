import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { requireAuth, requireRole } from '../auth';
import { ValidationError } from '../utils/errors';

const router = Router();

// Validation schemas
const eventRolesSchema = z.object({
  roles: z.array(z.string().min(1).max(100)).min(1).max(20),
});

// GET /api/settings/event-roles - Get default event roles
router.get('/event-roles', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const setting = await prisma.report_settings.findUnique({
      where: { key: 'event_roles' },
    });

    const roles = setting?.value as string[] || ['Participant', 'Instructor', 'Staff', 'Volunteer'];

    res.json({ roles });
  } catch (err) {
    next(err);
  }
});

// PUT /api/settings/event-roles - Update default event roles
router.put('/event-roles', requireAuth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validationResult = eventRolesSchema.safeParse(req.body);
    if (!validationResult.success) {
      const zodErrors = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new ValidationError(
        'Invalid event roles data',
        zodErrors,
        'Please check all required fields and try again.'
      );
    }

    const { roles } = validationResult.data;

    await prisma.report_settings.upsert({
      where: { key: 'event_roles' },
      update: {
        value: roles as unknown as any,
        updated_at: new Date(),
      },
      create: {
        key: 'event_roles',
        value: roles as unknown as any,
        updated_at: new Date(),
      },
    });

    res.json({ roles });
  } catch (err) {
    next(err);
  }
});

export { router as settingsRoutes };
