import type { Request, Response, NextFunction } from 'express';
import { getSession, type Session } from './session';

// Kiosk API key for device authentication (unattended kiosks)
function getKioskApiKey(): string {
  const key = process.env.KIOSK_API_KEY;
  if (!key) {
    throw new Error('KIOSK_API_KEY environment variable is required');
  }
  return key;
}

declare global {
  namespace Express {
    interface Request {
      session?: Session;
      user?: { id: string; username: string; role: string };
      isKiosk?: boolean;
      isDisplayAuth?: boolean;
      isDevAuth?: boolean;
    }
  }
}

function extractToken(req: Request): string | null {
  // 1. Try Authorization header (for dev/testing)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // 2. Try httpOnly cookie (production, XSS-protected)
  return (req.cookies?.auth_token as string) ?? null;
}

function extractKioskApiKey(req: Request): string | null {
  return req.headers['x-kiosk-api-key'] as string | null;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // DEV MODE: Auto-authenticate as developer (unless REQUIRE_AUTH=true)
    // Uses the actual admin user ID for foreign key compatibility
    const requireRealAuth = process.env.REQUIRE_AUTH === 'true';
    if (process.env.NODE_ENV !== 'production' && !requireRealAuth) {
      req.isDevAuth = true;
      req.user = {
        id: 'd52a5a61-4c03-46f6-bef8-32c9446fc471', // Actual admin user
        username: 'admin',
        role: 'developer', // Full access including Dev Tools
      };
      next();
      return;
    }

    // First, check for kiosk API key (for unattended kiosk devices)
    const kioskApiKey = extractKioskApiKey(req);
    if (kioskApiKey) {
      if (kioskApiKey === getKioskApiKey()) {
        req.isKiosk = true;
        req.user = {
          id: 'kiosk-device',
          username: 'kiosk',
          role: 'kiosk',
        };
        next();
        return;
      }
      res.status(401).json({ error: 'Invalid kiosk API key.' });
      return;
    }

    // Otherwise, check for Bearer token (admin users)
    const token = extractToken(req);

    if (!token) {
      res.status(401).json({ error: 'Authentication required. Please provide a valid token.' });
      return;
    }

    const session = await getSession(token);

    if (!session) {
      res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
      return;
    }

    // Attach session and user to request
    req.session = session;
    req.user = {
      id: session.userId,
      username: session.username,
      role: session.role,
    };

    next();
  } catch (error) {
    res.status(500).json({ error: 'Authentication check failed. Please try again.' });
  }
}

/**
 * Role-based access control middleware
 *
 * Role hierarchy (from least to most privileged):
 * - quartermaster: Standard users, no Settings or Logs access
 * - admin: Settings access except Dev Tools, can manage quartermaster/admin accounts
 * - developer: Full access including Dev Tools, can manage all accounts
 */
export function requireRole(...roles: string[]): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // requireAuth should have already run and attached user to request
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required. Please log in first.' });
        return;
      }

      const userRole = req.user.role;

      // Role hierarchy levels (higher number = more privileged)
      const roleHierarchy: Record<string, number> = {
        quartermaster: 1,
        admin: 2,
        developer: 3,
      };

      const userLevel = roleHierarchy[userRole] || 0;
      const requiredLevel = Math.min(...roles.map(role => roleHierarchy[role] || 999));

      // Allow if user's role level meets or exceeds the minimum required level
      if (userLevel < requiredLevel) {
        res.status(403).json({
          error: `Access denied. This action requires one of the following roles: ${roles.join(', ')}. Your role: ${userRole}`
        });
        return;
      }

      next();
    } catch (error) {
      res.status(500).json({ error: 'Role check failed. Please try again.' });
    }
  };
}

/**
 * Display authentication middleware
 * Allows read-only access to presence/activity data for TV displays
 * Accepts:
 * - Full admin JWT auth (Bearer token)
 * - Kiosk auth (x-kiosk-api-key)
 * - Display API key (x-display-api-key) - read-only access
 */
export async function requireDisplayAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // DEV MODE: Auto-authenticate as display device (unless REQUIRE_AUTH=true)
    const requireRealAuth = process.env.REQUIRE_AUTH === 'true';
    if (process.env.NODE_ENV !== 'production' && !requireRealAuth) {
      req.isDevAuth = true;
      req.isDisplayAuth = true;
      req.user = {
        id: 'dev-display',
        username: 'dev-display',
        role: 'display',
      };
      next();
      return;
    }

    // 1. Check for admin JWT auth
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      // Delegate to full admin auth
      return requireAuth(req, res, next);
    }

    // 2. Check for kiosk API key
    const kioskKey = extractKioskApiKey(req);
    if (kioskKey) {
      if (kioskKey === getKioskApiKey()) {
        req.isKiosk = true;
        req.user = {
          id: 'kiosk-device',
          username: 'kiosk',
          role: 'kiosk',
        };
        next();
        return;
      }
      res.status(401).json({
        error: 'Invalid kiosk API key.',
        code: 'INVALID_KIOSK_KEY'
      });
      return;
    }

    // 3. Check for display API key (read-only)
    const displayKey = req.headers['x-display-api-key'] as string | undefined;
    const expectedDisplayKey = process.env.DISPLAY_API_KEY;

    if (!expectedDisplayKey) {
      // If no display key configured, require admin auth
      res.status(401).json({
        error: 'Authentication required. Display API key not configured.',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    if (displayKey && displayKey === expectedDisplayKey) {
      // Mark request as display-authenticated (limited access)
      req.isDisplayAuth = true;
      req.user = {
        id: 'display-device',
        username: 'display',
        role: 'display',
      };
      next();
      return;
    }

    // No valid auth provided
    res.status(401).json({
      error: 'Authentication required. Please provide a valid Bearer token, kiosk API key, or display API key.',
      code: 'AUTH_REQUIRED'
    });
  } catch (error) {
    res.status(500).json({ error: 'Authentication check failed. Please try again.' });
  }
}
