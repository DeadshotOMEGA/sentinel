import { BaseRepository } from './base-repository';

export type AuditAction =
  | 'login'
  | 'logout'
  | 'login_failed'
  | 'member_create'
  | 'member_update'
  | 'member_delete'
  | 'badge_assign'
  | 'badge_unassign'
  | 'badge_status_change'
  | 'badge_create'
  | 'admin_create'
  | 'admin_update'
  | 'admin_delete'
  | 'import_preview'
  | 'import_execute'
  | 'event_create'
  | 'event_update'
  | 'event_delete';

interface AuditLogEntry {
  adminUserId: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string | null;
  details: Record<string, unknown>;
  ipAddress: string;
}

export class AuditRepository extends BaseRepository {
  async log(entry: AuditLogEntry): Promise<void> {
    await this.query(
      `INSERT INTO audit_log (admin_user_id, action, entity_type, entity_id, details, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        entry.adminUserId,
        entry.action,
        entry.entityType,
        entry.entityId,
        JSON.stringify(entry.details),
        entry.ipAddress,
      ]
    );
  }
}

export const auditRepository = new AuditRepository();
