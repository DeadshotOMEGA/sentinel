import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { lockupService } from '../services/lockup-service';
import { ValidationError } from '../utils/errors';

const router = Router();

// Validation schemas
const memberIdParamSchema = z.object({
  memberId: z.string().uuid('Invalid member ID format'),
});

const executeLockupSchema = z.object({
  memberId: z.string().uuid('Invalid member ID format'),
  note: z.string().max(1000).optional(),
});

// GET /api/lockup/check/:memberId - Check if member has Lockup tag (no auth - kiosk use)
router.get('/check/:memberId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validationResult = memberIdParamSchema.safeParse(req.params);
    if (!validationResult.success) {
      throw new ValidationError(
        'INVALID_MEMBER_ID',
        validationResult.error.message,
        'Please provide a valid member ID.'
      );
    }

    const hasLockupTag = await lockupService.checkMemberHasLockupTag(validationResult.data.memberId);
    res.json({ hasLockupTag });
  } catch (err) {
    next(err);
  }
});

// GET /api/lockup/present - Get all present members/visitors for lockup confirmation screen (no auth - kiosk use)
router.get('/present', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const presentData = await lockupService.getPresentMembersForLockup();
    res.json(presentData);
  } catch (err) {
    next(err);
  }
});

// POST /api/lockup/execute - Execute lockup checkout (no auth - kiosk use)
router.post('/execute', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validationResult = executeLockupSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError(
        'INVALID_LOCKUP_DATA',
        validationResult.error.message,
        'Please provide valid lockup data.'
      );
    }

    const result = await lockupService.executeLockup(
      validationResult.data.memberId,
      validationResult.data.note
    );

    res.json({
      success: true,
      checkedOut: result.checkedOut,
      auditLogId: result.auditLogId,
    });
  } catch (err) {
    next(err);
  }
});

export { router as lockupRoutes };
