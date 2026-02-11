import { Request, Response, NextFunction } from 'express'
import { authLogger } from '../lib/logger.js'

/**
 * Account level labels (for display/logging only — checks use numeric comparisons)
 *
 * 1 = Basic         — View own info
 * 2 = Quartermaster — Higher access, NOT lockup capable
 * 3 = Lockup        — Lockup capable (still needs qualification)
 * 4 = Command       — CO, XO, COXN, RPO — full operational authority
 * 5 = Admin         — System administration
 * 6 = Developer     — Everything
 */
export enum AccountLevel {
  BASIC = 1,
  QUARTERMASTER = 2,
  LOCKUP = 3,
  COMMAND = 4,
  ADMIN = 5,
  DEVELOPER = 6,
}

/**
 * Human-readable labels for account levels
 */
export const ACCOUNT_LEVEL_LABELS: Record<number, string> = {
  [AccountLevel.BASIC]: 'Basic',
  [AccountLevel.QUARTERMASTER]: 'Quartermaster',
  [AccountLevel.LOCKUP]: 'Lockup',
  [AccountLevel.COMMAND]: 'Command',
  [AccountLevel.ADMIN]: 'Admin',
  [AccountLevel.DEVELOPER]: 'Developer',
}

/**
 * Middleware: require authenticated member with minimum account level.
 */
export function requireMinimumLevel(level: number) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.member) {
      authLogger.warn('Level check failed: No authenticated member', {
        path: req.path,
        method: req.method,
      })

      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      })
    }

    if (req.member.accountLevel < level) {
      authLogger.warn('Level check failed: Insufficient account level', {
        path: req.path,
        method: req.method,
        memberLevel: req.member.accountLevel,
        requiredLevel: level,
      })

      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Required level: ${ACCOUNT_LEVEL_LABELS[level] ?? level}`,
      })
    }

    next()
  }
}

/**
 * Helper to check if member has at least the specified account level.
 */
export function hasMinimumLevel(memberLevel: number | undefined | null, required: number): boolean {
  return (memberLevel ?? 0) >= required
}
