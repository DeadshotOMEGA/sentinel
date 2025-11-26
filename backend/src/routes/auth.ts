import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { adminUserRepository } from '../db/repositories/admin-user-repository';
import { verifyPassword } from '../auth/password';
import { createSession, destroySession, refreshSession } from '../auth/session';
import { requireAuth } from '../auth';
import { UnauthorizedError, ValidationError } from '../utils/errors';

const router = Router();

// Validation schemas
const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

// POST /api/auth/login - Login with username/password
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
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

    // Return token and user info (without password hash)
    res.json({
      token,
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
router.post('/logout', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedError(
        'No token provided',
        'Missing Authorization header',
        'Please provide an authentication token.'
      );
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedError(
        'Invalid token format',
        'Authorization header must be in format: Bearer <token>',
        'Please provide a valid authentication token.'
      );
    }

    const token = parts[1];

    // Destroy session
    await destroySession(token);

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
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedError(
        'No token provided',
        'Missing Authorization header',
        'Please provide an authentication token.'
      );
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedError(
        'Invalid token format',
        'Authorization header must be in format: Bearer <token>',
        'Please provide a valid authentication token.'
      );
    }

    const token = parts[1];

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

export { router as authRoutes };
