import { Request, Response, NextFunction } from 'express';
import { auditRepository, AuditAction } from '../db/repositories/audit-repository';
import { logger } from '../utils/logger';

export function audit(action: AuditAction, entityType: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    res.on('finish', async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          if (!req.ip) {
            throw new Error('IP address is required for audit logging');
          }

          await auditRepository.log({
            adminUserId: req.isDevAuth ? null : (req.user?.id || null),
            action,
            entityType,
            entityId: req.params.id || null,
            details: { body: req.body, params: req.params, query: req.query },
            ipAddress: req.ip,
          });
        } catch (err) {
          logger.error('Audit log failed', { error: err });
        }
      }
    });
    next();
  };
}
