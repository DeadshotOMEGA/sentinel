import type { Request, Response, NextFunction } from 'express';
import { getSession, type Session } from './session';

// Kiosk API key for device authentication (unattended kiosks)
function getKioskApiKey(): string {
  const key = process.env.KIOSK_API_KEY;
  if (!key) {
    // In development, use a default key. In production, this should be set.
    if (process.env.NODE_ENV === 'production') {
      throw new Error('KIOSK_API_KEY environment variable must be set in production');
    }
    return 'kiosk-dev-key-change-in-production';
  }
  return key;
}

declare global {
  namespace Express {
    interface Request {
      session?: Session;
      user?: { id: string; username: string; role: string };
      isKiosk?: boolean;
    }
  }
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

function extractKioskApiKey(req: Request): string | null {
  return req.headers['x-kiosk-api-key'] as string | null;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
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

export function requireRole(...roles: string[]): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // requireAuth should have already run and attached user to request
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required. Please log in first.' });
        return;
      }

      const userRole = req.user.role;

      if (!roles.includes(userRole)) {
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
