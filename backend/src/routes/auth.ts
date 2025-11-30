import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { adminUserRepository } from '../db/repositories/admin-user-repository';
import { verifyPassword } from '../auth/password';
import { createSession, destroySession, refreshSession } from '../auth/session';
import { requireAuth } from '../auth';
import { UnauthorizedError, ValidationError } from '../utils/errors';
import { authLimiter } from '../middleware/rate-limit';
import { passwordSchema } from '../utils/password-policy';
import { audit } from '../middleware/audit';

const router = Router();

// Validation schemas
const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1), // Login uses basic validation (full policy only on registration/change)
});

// POST /api/auth/login - Login with username/password
router.post('/login', authLimiter, audit('login', 'session'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validationResult = loginSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid login credentials',
        validationResult.error.message,
        'Please provide both username and password.'
      );
    }

    const { username, password } = validationResult.data;

    // Find user by username (includes password hash)
    const user = await adminUserRepository.findByUsername(username);
    if (!user) {
      throw new UnauthorizedError(
        'Invalid credentials',
        `User ${username} not found`,
        'Username or password is incorrect. Please try again.'
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedError(
        'Invalid credentials',
        'Password verification failed',
        'Username or password is incorrect. Please try again.'
      );
    }

    // Create session
    const token = await createSession(user);

    // Update last login timestamp
    await adminUserRepository.updateLastLogin(user.id);

    // Set httpOnly cookie for secure token storage (XSS protection)
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('auth_token', token, {
      httpOnly: true, // Prevent JavaScript access (XSS protection)
      secure: isProduction, // HTTPS only in production
      sameSite: 'strict', // CSRF protection
      maxAge: 8 * 60 * 60 * 1000, // 8 hours (matches session TTL)
      path: '/',
    });

    // Return user info only (token is in httpOnly cookie)
    res.json({
      user: {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        email: user.email,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout - Destroy session
router.post('/logout', requireAuth, audit('logout', 'session'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.auth_token as string | undefined;

    if (!token) {
      throw new UnauthorizedError(
        'No token provided',
        'Missing auth_token cookie',
        'Please provide an authentication token.'
      );
    }

    // Destroy session
    await destroySession(token);

    // Clear httpOnly cookie
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me - Get current user info
router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError(
        'Not authenticated',
        'User information not found in request',
        'Please log in again.'
      );
    }

    // Fetch fresh user data
    const user = await adminUserRepository.findById(req.user.id);
    if (!user) {
      throw new UnauthorizedError(
        'User not found',
        `User ${req.user.id} not found`,
        'Your user account may have been deleted. Please contact an administrator.'
      );
    }

    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh - Refresh session
router.post('/refresh', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.auth_token as string | undefined;

    if (!token) {
      throw new UnauthorizedError(
        'No token provided',
        'Missing auth_token cookie',
        'Please provide an authentication token.'
      );
    }

    // Refresh session
    const success = await refreshSession(token);
    if (!success) {
      throw new UnauthorizedError(
        'Session refresh failed',
        'Failed to refresh session',
        'Your session has expired. Please log in again.'
      );
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/change-password - Change password for current user
router.post('/change-password', requireAuth, authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const changePasswordSchema = z.object({
      currentPassword: z.string().min(1),
      newPassword: passwordSchema, // HIGH-2 FIX: Enforce strong password policy
    });

    const validationResult = changePasswordSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError(
        'Password change validation failed',
        validationResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        'Please ensure your new password meets all requirements.'
      );
    }

    const { currentPassword, newPassword } = validationResult.data;

    if (!req.user) {
      throw new UnauthorizedError(
        'Not authenticated',
        'User information not found in request',
        'Please log in again.'
      );
    }

    // Fetch user with password hash
    const user = await adminUserRepository.findByUsername(req.user.username);
    if (!user) {
      throw new UnauthorizedError(
        'User not found',
        `User ${req.user.username} not found`,
        'Your user account may have been deleted. Please contact an administrator.'
      );
    }

    // Verify current password
    const isValidPassword = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedError(
        'Invalid current password',
        'Current password verification failed',
        'The current password you entered is incorrect.'
      );
    }

    // Check if new password is same as current (prevent reuse)
    const isSamePassword = await verifyPassword(newPassword, user.passwordHash);
    if (isSamePassword) {
      throw new ValidationError(
        'New password must be different',
        'New password matches current password',
        'Please choose a different password from your current one.'
      );
    }

    // Hash new password
    const { hashPassword } = await import('../auth/password');
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await adminUserRepository.update(user.id, { passwordHash: newPasswordHash });

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
});

export { router as authRoutes };
