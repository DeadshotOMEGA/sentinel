import { Request, Response, NextFunction } from 'express'
import { authLogger } from '../lib/logger.js'

/**
 * Role hierarchy (highest to lowest authority)
 *
 * 5. Developer - Full system access
 * 4. Admin - User management, system settings
 * 3. Executive - Read-only oversight (CO, XO, Coxswain, Staff Officer)
 * 2. Duty Watch - Active watch operations, limited user updates
 * 1. Quartermaster - Minimal access (check-ins and member lookup only)
 */
export enum Role {
  DEVELOPER = 'developer',
  ADMIN = 'admin',
  EXECUTIVE = 'executive',
  DUTY_WATCH = 'duty_watch',
  QUARTERMASTER = 'quartermaster',
}

/**
 * Role hierarchy levels for comparison
 */
const ROLE_LEVELS: Record<string, number> = {
  [Role.DEVELOPER]: 5,
  [Role.ADMIN]: 4,
  [Role.EXECUTIVE]: 3,
  [Role.DUTY_WATCH]: 2,
  [Role.QUARTERMASTER]: 1,
}

/**
 * Check if user has required role
 *
 * @param allowedRoles - Array of roles that can access the endpoint, or 'all' for any authenticated user
 * @returns Express middleware function
 */
export function requireRole(allowedRoles: string[] | 'all') {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Check if user is authenticated
    if (!req.user) {
      authLogger.warn('Role check failed: No authenticated user', {
        path: req.path,
        method: req.method,
      })

      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      })
    }

    // Allow all authenticated users
    if (allowedRoles === 'all') {
      return next()
    }

    // Get user's role
    const userRole = req.user.role || Role.QUARTERMASTER

    // Check if user has one of the allowed roles
    if (!allowedRoles.includes(userRole)) {
      authLogger.warn('Role check failed: Insufficient permissions', {
        path: req.path,
        method: req.method,
        userRole,
        requiredRoles: allowedRoles,
      })

      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
      })
    }

    next()
  }
}

/**
 * Check if user has at least the minimum required role level
 *
 * @param minimumRole - Minimum role required (users with higher roles also allowed)
 * @returns Express middleware function
 */
export function requireMinimumRole(minimumRole: Role) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      authLogger.warn('Minimum role check failed: No authenticated user', {
        path: req.path,
        method: req.method,
      })

      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      })
    }

    const userRole = req.user.role || Role.QUARTERMASTER
    const userLevel = ROLE_LEVELS[userRole] || 0
    const minimumLevel = ROLE_LEVELS[minimumRole] || 0

    if (userLevel < minimumLevel) {
      authLogger.warn('Minimum role check failed: Insufficient role level', {
        path: req.path,
        method: req.method,
        userRole,
        userLevel,
        minimumRole,
        minimumLevel,
      })

      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Minimum required role: ${minimumRole}`,
      })
    }

    next()
  }
}

/**
 * Helper to check if user has specific role
 */
export function hasRole(userRole: string | undefined | null, targetRole: Role): boolean {
  return userRole === targetRole
}

/**
 * Helper to check if user has minimum role level
 */
export function hasMinimumRole(userRole: string | undefined | null, minimumRole: Role): boolean {
  const userLevel = ROLE_LEVELS[userRole || Role.QUARTERMASTER] || 0
  const minimumLevel = ROLE_LEVELS[minimumRole] || 0
  return userLevel >= minimumLevel
}
